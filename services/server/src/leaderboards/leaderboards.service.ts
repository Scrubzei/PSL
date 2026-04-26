import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Leaderboard } from './leaderboard.entity';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { Match } from '../matches/match.entity';
import { TournamentMatch } from '../tournaments/tournament-match.entity';
import { UsersService } from '../users/users.service';
import { calculateEloChange, initialEloRating } from './elo.util';
import { rankScoreForLadderRank, reorderRankedUserIdsAfterUpset } from './ladder-reorder.util';

export interface LeaderboardEntryWithRank {
  id: string;
  rank: number;
  userId: string;
  username: string;
  emblem: string | null;
  xp: number;
  rankScore: number;
  elo: number | null;
  rankedOptIn: boolean;
  xpOptIn: boolean;
  wins: number;
  losses: number;
  createdAt: Date;
}

@Injectable()
export class LeaderboardsService {
  constructor(
    @InjectRepository(Leaderboard)
    private leaderboardsRepository: Repository<Leaderboard>,
    @InjectRepository(LeaderboardEntry)
    private leaderboardEntriesRepository: Repository<LeaderboardEntry>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(TournamentMatch)
    private tournamentMatchesRepository: Repository<TournamentMatch>,
    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<Leaderboard[]> {
    return this.leaderboardsRepository
      .createQueryBuilder('leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .getMany();
  }

  async findByGameAndPlatform(gameName: string, platformName: string): Promise<Leaderboard> {
    const leaderboard = await this.leaderboardsRepository
      .createQueryBuilder('leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('LOWER(game.name) = LOWER(:gameName)', { gameName })
      .andWhere('LOWER(platform.name) = LOWER(:platformName)', { platformName })
      .getOne();

    if (!leaderboard) {
      throw new NotFoundException(`Leaderboard not found for ${gameName} on ${platformName}`);
    }

    return leaderboard;
  }

  async findById(id: string): Promise<Leaderboard> {
    const leaderboard = await this.leaderboardsRepository
      .createQueryBuilder('leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('leaderboard.id = :id', { id })
      .getOne();

    if (!leaderboard) {
      throw new NotFoundException('Leaderboard not found');
    }

    return leaderboard;
  }

  async signup(userId: string, leaderboardId: string): Promise<LeaderboardEntry> {
    await this.findById(leaderboardId);

    const existing = await this.leaderboardEntriesRepository.findOne({
      where: { userId, leaderboardId },
    });

    if (existing) {
      if (existing.rankedOptIn) {
        throw new ConflictException('You are already signed up for this leaderboard');
      }
      // XP-only (or neutral) entry: join the ranked ladder
      const lowestEntry = await this.leaderboardEntriesRepository
        .createQueryBuilder('entry')
        .where('entry.leaderboardId = :leaderboardId', { leaderboardId })
        .andWhere('entry.rankedOptIn = :r', { r: true })
        .orderBy('entry.rankScore', 'ASC')
        .getOne();

      const rankScore = lowestEntry ? Math.max(lowestEntry.rankScore - 100, 100) : 1000;
      existing.rankScore = rankScore;
      existing.rankedOptIn = true;
      return this.leaderboardEntriesRepository.save(existing);
    }

    const lowestEntry = await this.leaderboardEntriesRepository
      .createQueryBuilder('entry')
      .where('entry.leaderboardId = :leaderboardId', { leaderboardId })
      .andWhere('entry.rankedOptIn = :r', { r: true })
      .orderBy('entry.rankScore', 'ASC')
      .getOne();

    const rankScore = lowestEntry ? Math.max(lowestEntry.rankScore - 100, 100) : 1000;

    const entry = this.leaderboardEntriesRepository.create({
      userId,
      leaderboardId,
      xp: 0,
      rankScore,
      rankedOptIn: true,
    });

    return this.leaderboardEntriesRepository.save(entry);
  }

  async addUserByUsername(leaderboardId: string, username: string): Promise<LeaderboardEntry> {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`User "${username}" not found`);
    }
    return this.signup(user.id, leaderboardId);
  }

  async getEntries(leaderboardId: string, type: 'ranked' | 'xp'): Promise<LeaderboardEntryWithRank[]> {
    // Check if leaderboard exists
    await this.findById(leaderboardId);

    const query = this.leaderboardEntriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .where('entry.leaderboardId = :leaderboardId', { leaderboardId });

    if (type === 'ranked') {
      query.andWhere('entry.rankedOptIn = :rankedOptIn', { rankedOptIn: true });
      query.orderBy('entry.rankScore', 'DESC').addOrderBy('entry.createdAt', 'ASC');
    } else {
      query.andWhere('entry.xpOptIn = :xpOptIn', { xpOptIn: true });
      query.orderBy('entry.elo', 'DESC').addOrderBy('entry.createdAt', 'ASC');
    }

    const entries = await query.getMany();

    // Get all user IDs for this leaderboard
    const userIds = entries.map(e => e.userId);

    // Create a map of userId -> { wins, losses }
    const statsMap = new Map<string, { wins: number; losses: number }>();

    if (userIds.length > 0) {
      // Get the leaderboard's game and platform to match tournaments
      const leaderboard = await this.leaderboardsRepository.findOne({
        where: { id: leaderboardId },
      });

      // Get completed matches for this leaderboard
      const completedMatches = await this.matchesRepository.find({
        where: {
          leaderboardId,
          status: 'COMPLETED' as const,
        },
      });

      // Get completed tournament matches for the same game/platform
      const tournamentMatches = leaderboard
        ? await this.tournamentMatchesRepository
            .createQueryBuilder('tm')
            .innerJoin('tm.tournament', 't')
            .where('t.gameId = :gameId', { gameId: leaderboard.gameId })
            .andWhere('t.platformId = :platformId', { platformId: leaderboard.platformId })
            .andWhere('tm.status = :status', { status: 'COMPLETED' })
            .andWhere('tm.isBye = false')
            .andWhere('tm.winnerId IS NOT NULL')
            .getMany()
        : [];

      // Count wins and losses for each user
      for (const userId of userIds) {
        let wins = 0;
        let losses = 0;

        // Count from regular matches
        for (const match of completedMatches) {
          const isParticipant = match.challengerId === userId || match.challengeeId === userId;
          if (isParticipant && match.winnerId) {
            if (match.winnerId === userId) {
              wins++;
            } else {
              losses++;
            }
          }
        }

        // Count from tournament matches
        for (const tm of tournamentMatches) {
          const isParticipant = tm.player1Id === userId || tm.player2Id === userId;
          if (isParticipant) {
            if (tm.winnerId === userId) {
              wins++;
            } else {
              losses++;
            }
          }
        }

        statsMap.set(userId, { wins, losses });
      }
    }

    // Add rank numbers and computed wins/losses
    return entries.map((entry, index) => {
      const stats = statsMap.get(entry.userId) || { wins: 0, losses: 0 };
      return {
        id: entry.id,
        rank: index + 1,
        userId: entry.userId,
        username: entry.user.username,
        emblem: entry.user.emblem || null,
        xp: entry.xp,
        rankScore: entry.rankScore,
        elo: entry.elo ?? null,
        rankedOptIn: entry.rankedOptIn,
        xpOptIn: entry.xpOptIn,
        wins: stats.wins,
        losses: stats.losses,
        createdAt: entry.createdAt,
      };
    });
  }

  /** New XP ladder participant without joining the ranked placement ladder. */
  private async createXpOnlyEntry(userId: string, leaderboardId: string): Promise<LeaderboardEntry> {
    await this.findById(leaderboardId);
    const entry = this.leaderboardEntriesRepository.create({
      userId,
      leaderboardId,
      xp: 0,
      rankScore: 0,
      rankedOptIn: false,
      xpOptIn: true,
      elo: initialEloRating,
    });
    return this.leaderboardEntriesRepository.save(entry);
  }

  async xpJoin(userId: string, leaderboardId: string): Promise<LeaderboardEntry> {
    await this.findById(leaderboardId);
    let entry = await this.getUserEntry(userId, leaderboardId);
    if (!entry) {
      entry = await this.createXpOnlyEntry(userId, leaderboardId);
      return entry;
    }
    if (entry.xpOptIn) {
      throw new ConflictException('You already joined the XP ladder for this leaderboard');
    }
    entry.xpOptIn = true;
    entry.elo = initialEloRating;
    return this.leaderboardEntriesRepository.save(entry);
  }

  /**
   * After a completed RANKED match, reorder rankScore when the winner was lower on the ladder (upset).
   * If the winner was already ranked above the loser (favorite wins), rankScore is unchanged.
   * Uses {@link reorderRankedUserIdsAfterUpset} — see ladder-reorder.util.ts for spec examples.
   * Idempotent via match.rankedLadderApplied.
   */
  async applyRankedLadderAfterMatchCompletion(matchId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const match = await manager.findOne(Match, { where: { id: matchId } });
      if (
        !match ||
        match.type !== 'RANKED' ||
        match.status !== 'COMPLETED' ||
        !match.winnerId ||
        !match.challengeeId ||
        match.rankedLadderApplied
      ) {
        return;
      }

      const loserId =
        match.winnerId === match.challengerId ? match.challengeeId! : match.challengerId;

      const entries = await manager
        .getRepository(LeaderboardEntry)
        .createQueryBuilder('entry')
        .where('entry.leaderboardId = :leaderboardId', { leaderboardId: match.leaderboardId })
        .andWhere('entry.rankedOptIn = :r', { r: true })
        .orderBy('entry.rankScore', 'DESC')
        .addOrderBy('entry.createdAt', 'ASC')
        .getMany();

      const userIds = entries.map((e) => e.userId);
      const reordered = reorderRankedUserIdsAfterUpset(userIds, match.winnerId, loserId);

      if (reordered === null) {
        match.rankedLadderApplied = true;
        match.rankedSnapshotBefore = null;
        await manager.save(match);
        return;
      }

      match.rankedSnapshotBefore = entries.map((e) => ({
        userId: e.userId,
        rankScore: Number(e.rankScore),
      }));

      const entryByUser = new Map(entries.map((e) => [e.userId, e]));
      for (let i = 0; i < reordered.length; i++) {
        const uid = reordered[i];
        const rank = i + 1;
        const entry = entryByUser.get(uid);
        if (!entry) continue;
        entry.rankScore = rankScoreForLadderRank(rank);
        await manager.save(entry);
      }

      match.rankedLadderApplied = true;
      await manager.save(match);
    });
  }

  /** Apply Elo deltas from frozen snapshots on match (XP ladder only). Idempotent via eloApplied. */
  async applyXpEloAfterMatchCompletion(matchId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const match = await manager.findOne(Match, { where: { id: matchId } });
      if (
        !match ||
        match.type !== 'XP' ||
        match.status !== 'COMPLETED' ||
        !match.winnerId ||
        match.eloApplied
      ) {
        return;
      }
      if (match.challengerEloBefore == null || match.challengeeEloBefore == null) {
        return;
      }

      const challengerWon = match.winnerId === match.challengerId;
      const { challengerEloChange, opponentEloChange } = calculateEloChange(
        match.challengerEloBefore,
        match.challengeeEloBefore,
        challengerWon,
      );

      // Anti-boost: decay ELO gains when the same two players play repeatedly.
      // Count completed XP matches between these two in the last 24 hours
      // (excluding the current match).
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentH2HCount: number = await manager
        .createQueryBuilder(Match, 'm')
        .where('m.id != :matchId', { matchId: match.id })
        .andWhere('m.type = :type', { type: 'XP' })
        .andWhere('m.status = :status', { status: 'COMPLETED' })
        .andWhere('m.leaderboardId = :lbId', { lbId: match.leaderboardId })
        .andWhere('m.completedAt >= :since', { since: oneDayAgo })
        .andWhere(
          '((m.challengerId = :p1 AND m.challengeeId = :p2) OR (m.challengerId = :p2 AND m.challengeeId = :p1))',
          { p1: match.challengerId, p2: match.challengeeId },
        )
        .getCount();

      // Decay: 1.0x, 0.5x, 0.25x, 0.1x (floor)
      const DECAY_MULTIPLIERS = [1.0, 0.5, 0.25, 0.1];
      const decayMultiplier = DECAY_MULTIPLIERS[Math.min(recentH2HCount, DECAY_MULTIPLIERS.length - 1)];

      const adjustedChallengerEloChange = Math.round(challengerEloChange * decayMultiplier);
      const adjustedOpponentEloChange = Math.round(opponentEloChange * decayMultiplier);

      const chEntry = await manager.findOne(LeaderboardEntry, {
        where: { userId: match.challengerId, leaderboardId: match.leaderboardId },
      });
      const ceEntry = await manager.findOne(LeaderboardEntry, {
        where: { userId: match.challengeeId!, leaderboardId: match.leaderboardId },
      });
      if (!chEntry || !ceEntry || !chEntry.xpOptIn || !ceEntry.xpOptIn) {
        return;
      }

      chEntry.elo = match.challengerEloBefore + adjustedChallengerEloChange;
      ceEntry.elo = match.challengeeEloBefore + adjustedOpponentEloChange;

      match.lastChallengerEloDelta = adjustedChallengerEloChange;
      match.lastChallengeeEloDelta = adjustedOpponentEloChange;
      match.eloApplied = true;

      await manager.save([chEntry, ceEntry]);
      await manager.save(match);
    });
  }

  /** Reset ladder Elo to frozen pre-match snapshots (used when ref decision is disputed). */
  async rollbackXpEloForMatch(matchId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const match = await manager.findOne(Match, { where: { id: matchId } });
      if (!match || !match.eloApplied || match.challengerEloBefore == null || match.challengeeEloBefore == null) {
        return;
      }

      const chEntry = await manager.findOne(LeaderboardEntry, {
        where: { userId: match.challengerId, leaderboardId: match.leaderboardId },
      });
      const ceEntry = await manager.findOne(LeaderboardEntry, {
        where: { userId: match.challengeeId!, leaderboardId: match.leaderboardId },
      });
      if (!chEntry || !ceEntry) {
        return;
      }

      chEntry.elo = match.challengerEloBefore;
      ceEntry.elo = match.challengeeEloBefore;
      match.eloApplied = false;
      match.lastChallengerEloDelta = null;
      match.lastChallengeeEloDelta = null;

      await manager.save([chEntry, ceEntry]);
      await manager.save(match);
    });
  }

  /**
   * Restore rankScore from snapshot when players dispute a ref ruling (before admin re-decides).
   * Clears rankedLadderApplied; favorite-win matches only flip the flag (no snapshot rows).
   */
  async rollbackRankedLadderForMatch(matchId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const match = await manager.findOne(Match, { where: { id: matchId } });
      if (!match || !match.rankedLadderApplied) {
        return;
      }

      if (match.rankedSnapshotBefore && match.rankedSnapshotBefore.length > 0) {
        for (const snap of match.rankedSnapshotBefore) {
          const entry = await manager.findOne(LeaderboardEntry, {
            where: { userId: snap.userId, leaderboardId: match.leaderboardId },
          });
          if (entry) {
            entry.rankScore = Number(snap.rankScore);
            await manager.save(entry);
          }
        }
      }

      match.rankedLadderApplied = false;
      match.rankedSnapshotBefore = null;
      await manager.save(match);
    });
  }

  async getUserEntry(userId: string, leaderboardId: string): Promise<LeaderboardEntry | null> {
    return this.leaderboardEntriesRepository.findOne({
      where: { userId, leaderboardId },
    });
  }

  async isUserSignedUp(userId: string, leaderboardId: string): Promise<boolean> {
    const entry = await this.getUserEntry(userId, leaderboardId);
    return !!entry;
  }

  async updateRanks(leaderboardId: string, ranks: { userId: string; rank: number }[]): Promise<void> {
    await this.findById(leaderboardId);

    // Sort by rank ascending (1 = best) and assign descending rankScore
    const sorted = [...ranks].sort((a, b) => a.rank - b.rank);

    for (const { userId, rank } of sorted) {
      const entry = await this.leaderboardEntriesRepository.findOne({
        where: { userId, leaderboardId },
      });
      if (!entry) continue;
      if (!entry.rankedOptIn) continue;

      // Higher rank position (1st) gets higher rankScore
      // e.g., rank 1 = 100000, rank 2 = 99000, etc.
      entry.rankScore = 100000 - (rank - 1) * 1000;
      await this.leaderboardEntriesRepository.save(entry);
    }
  }

  async awardXp(userId: string, leaderboardId: string, amount: number): Promise<LeaderboardEntry> {
    let entry = await this.leaderboardEntriesRepository.findOne({
      where: { userId, leaderboardId },
    });

    if (!entry) {
      entry = this.leaderboardEntriesRepository.create({
        userId,
        leaderboardId,
        xp: 0,
        rankScore: 0,
        rankedOptIn: false,
        xpOptIn: false,
      });
      entry = await this.leaderboardEntriesRepository.save(entry);
    }

    entry.xp += amount;
    return this.leaderboardEntriesRepository.save(entry);
  }
}
