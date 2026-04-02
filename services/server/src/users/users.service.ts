import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { Match } from '../matches/match.entity';
import { LeaderboardEntry } from '../leaderboards/leaderboard-entry.entity';
import { TournamentMatch } from '../tournaments/tournament-match.entity';
import { Tournament } from '../tournaments/tournament.entity';
export interface UserProfileStats {
  totalWins: number;
  totalLosses: number;
  winRate: number;
  recentMatches: any[];
}

export interface HeadToHeadStats {
  user: { id: string; username: string };
  opponent: { id: string; username: string };
  userWins: number;
  opponentWins: number;
  totalMatches: number;
  recentMatches: any[];
}

export interface LeaderboardRanking {
  leaderboardId: string;
  game: string;
  platform: string;
  /** Placement among ranked participants only; null if not on the ranked ladder */
  rank: number | null;
  totalPlayers: number;
  xp: number;
  rankScore: number;
  elo: number | null;
  rankedOptIn: boolean;
  xpOptIn: boolean;
  wins: number;
  losses: number;
}

export interface UserDashboardStats {
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  leaderboardRankings: LeaderboardRanking[];
}

export interface GlobalRecentWin {
  matchId: string;
  winner: { id: string; username: string; avatar?: string };
  loser: { id: string; username: string; avatar?: string };
  game: string;
  platform: string;
  matchType: 'XP' | 'RANKED';
  completedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(LeaderboardEntry)
    private leaderboardEntriesRepository: Repository<LeaderboardEntry>,
    @InjectRepository(TournamentMatch)
    private tournamentMatchesRepository: Repository<TournamentMatch>,
    @InjectRepository(Tournament)
    private tournamentsRepository: Repository<Tournament>,
  ) {}

  async findByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findUserIdsWithRoles(roles: UserRole[]): Promise<string[]> {
    if (roles.length === 0) {
      return [];
    }
    const users = await this.usersRepository.find({
      where: { role: In(roles) },
      select: ['id'],
    });
    return users.map((u) => u.id);
  }

  async findById(id: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByDiscordId(discordId: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { discordId } });
  }

  async createFromDiscord(discordId: string): Promise<User> {
    const user = this.usersRepository.create({ discordId });
    return this.usersRepository.save(user);
  }

  async setUsername(userId: string, username: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.username = username;
    return this.usersRepository.save(user);
  }

  async updateProfile(userId: string, data: { plutoniumUsername?: string; xboxGamertag?: string }): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (data.plutoniumUsername !== undefined) {
      user.plutoniumUsername = data.plutoniumUsername;
    }
    if (data.xboxGamertag !== undefined) {
      user.xboxGamertag = data.xboxGamertag;
    }
    return this.usersRepository.save(user);
  }

  async findByPlutoId(plutoId: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { plutoId } });
  }

  async setPlutoId(userId: string, plutoId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.plutoId = plutoId;
    return this.usersRepository.save(user);
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const existingUser = await this.findByUsername(username);
    return !existingUser;
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async searchByUsername(username: string): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.username ILIKE :username', { username: `%${username}%` })
      .getMany();
  }

  async findByUsernameExact(username: string): Promise<User | undefined> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username })
      .getOne();
  }

  async getHeadToHeadStats(userId: string, opponentId: string): Promise<HeadToHeadStats> {
    const user = await this.findById(userId);
    const opponent = await this.findById(opponentId);

    if (!user || !opponent) {
      throw new Error('User not found');
    }

    const matches = await this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('match.status = :status', { status: 'COMPLETED' })
      .andWhere(
        '((match.challengerId = :userId AND match.challengeeId = :opponentId) OR (match.challengerId = :opponentId AND match.challengeeId = :userId))',
        { userId, opponentId }
      )
      .orderBy('match.updatedAt', 'DESC')
      .getMany();

    const userWins = matches.filter(m => m.winnerId === userId).length;
    const opponentWins = matches.filter(m => m.winnerId === opponentId).length;

    return {
      user: { id: user.id, username: user.username },
      opponent: { id: opponent.id, username: opponent.username },
      userWins,
      opponentWins,
      totalMatches: matches.length,
      recentMatches: matches.slice(0, 10).map(match => ({
        id: match.id,
        game: match.leaderboard?.game?.name,
        platform: match.leaderboard?.platform?.name,
        type: match.type,
        winnerId: match.winnerId,
        winnerUsername: match.winnerId === userId ? user.username : opponent.username,
        createdAt: match.createdAt,
      })),
    };
  }

  async getUserProfileStats(userId: string): Promise<UserProfileStats> {
    // Get total wins and losses from completed matches
    const completedMatches = await this.matchesRepository.find({
      where: [
        { challengerId: userId, status: 'COMPLETED' as const },
        { challengeeId: userId, status: 'COMPLETED' as const },
      ],
    });

    let totalWins = 0;
    let totalLosses = 0;
    for (const match of completedMatches) {
      if (match.winnerId === userId) {
        totalWins++;
      } else if (match.winnerId) {
        totalLosses++;
      }
    }

    // Count tournament match wins/losses
    const tournamentMatches = await this.tournamentMatchesRepository
      .createQueryBuilder('tm')
      .where('tm.status = :status', { status: 'COMPLETED' })
      .andWhere('tm.isBye = false')
      .andWhere('tm.winnerId IS NOT NULL')
      .andWhere('(tm.player1Id = :userId OR tm.player2Id = :userId)', { userId })
      .getMany();

    for (const tm of tournamentMatches) {
      if (tm.winnerId === userId) {
        totalWins++;
      } else {
        totalLosses++;
      }
    }

    const totalMatches = totalWins + totalLosses;
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

    // Get recent completed matches
    const recentMatches = await this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('(match.challengerId = :userId OR match.challengeeId = :userId)', { userId })
      .andWhere('match.status IN (:...statuses)', { statuses: ['COMPLETED', 'ACCEPTED'] })
      .orderBy('match.updatedAt', 'DESC')
      .take(10)
      .getMany();

    return {
      totalWins,
      totalLosses,
      winRate,
      recentMatches: recentMatches.map(match => ({
        id: match.id,
        opponent: match.challengerId === userId
          ? { id: match.challengee.id, username: match.challengee.username, avatar: match.challengee.avatar }
          : { id: match.challenger.id, username: match.challenger.username, avatar: match.challenger.avatar },
        game: match.leaderboard.game.name,
        platform: match.leaderboard.platform.name,
        type: match.type,
        status: match.status,
        isChallenger: match.challengerId === userId,
        winnerId: match.winnerId,
        isWinner: match.winnerId === userId,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
      })),
    };
  }

  async getUserTrophies(userId: string): Promise<{ gold: number; silver: number; bronze: number }> {
    // Get all completed tournaments
    const completedTournaments = await this.tournamentsRepository.find({
      where: { status: 'COMPLETED' as any },
    });

    let gold = 0;
    let silver = 0;
    let bronze = 0;

    for (const tournament of completedTournaments) {
      // Get the finals match (round 1) for this tournament
      const finalsMatch = await this.tournamentMatchesRepository.findOne({
        where: { tournamentId: tournament.id, round: 1, status: 'COMPLETED' as any },
      });

      if (!finalsMatch || !finalsMatch.winnerId) continue;

      // 1st place: winner of finals
      if (finalsMatch.winnerId === userId) {
        gold++;
        continue;
      }

      // 2nd place: loser of finals
      const finalsLoser = finalsMatch.player1Id === finalsMatch.winnerId
        ? finalsMatch.player2Id
        : finalsMatch.player1Id;
      if (finalsLoser === userId) {
        silver++;
        continue;
      }

      // 3rd place: losers of semi-finals (round 2)
      const semiMatches = await this.tournamentMatchesRepository.find({
        where: { tournamentId: tournament.id, round: 2, status: 'COMPLETED' as any },
      });

      for (const semi of semiMatches) {
        if (!semi.winnerId || semi.isBye) continue;
        const semiLoser = semi.player1Id === semi.winnerId ? semi.player2Id : semi.player1Id;
        if (semiLoser === userId) {
          bronze++;
          break;
        }
      }
    }

    return { gold, silver, bronze };
  }

  // Calculate level from XP: Level = floor(sqrt(totalXP / 100)) + 1
  // This means: Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 400 XP, Level 4 = 900 XP, etc.
  private calculateLevel(totalXp: number): { level: number; xpToNextLevel: number } {
    const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpToNextLevel = xpForNextLevel - totalXp;
    return { level, xpToNextLevel };
  }

  async getUserDashboardStats(userId: string): Promise<UserDashboardStats> {
    // Get user's leaderboard entries
    const entries = await this.leaderboardEntriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('entry.userId = :userId', { userId })
      .getMany();

    // Calculate total XP across all leaderboards
    const totalXp = entries.reduce((sum, entry) => sum + entry.xp, 0);
    const { level, xpToNextLevel } = this.calculateLevel(totalXp);

    // Get rankings for each leaderboard
    const leaderboardRankings: LeaderboardRanking[] = [];

    for (const entry of entries) {
      const allRankedEntries = await this.leaderboardEntriesRepository
        .createQueryBuilder('e')
        .where('e.leaderboardId = :leaderboardId', { leaderboardId: entry.leaderboardId })
        .andWhere('e.rankedOptIn = :r', { r: true })
        .orderBy('e.rankScore', 'DESC')
        .addOrderBy('e.createdAt', 'ASC')
        .getMany();

      const rank = entry.rankedOptIn
        ? allRankedEntries.findIndex(e => e.userId === userId) + 1
        : null;
      const totalPlayers = allRankedEntries.length;

      // Get wins/losses for this leaderboard
      const completedMatches = await this.matchesRepository.find({
        where: {
          leaderboardId: entry.leaderboardId,
          status: 'COMPLETED' as const,
        },
      });

      let wins = 0;
      let losses = 0;
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

      leaderboardRankings.push({
        leaderboardId: entry.leaderboardId,
        game: entry.leaderboard.game.name,
        platform: entry.leaderboard.platform.name,
        rank,
        totalPlayers,
        xp: entry.xp,
        rankScore: entry.rankScore,
        elo: entry.elo ?? null,
        rankedOptIn: entry.rankedOptIn,
        xpOptIn: entry.xpOptIn,
        wins,
        losses,
      });
    }

    // Get total wins/losses across all leaderboards
    const completedMatches = await this.matchesRepository.find({
      where: [
        { challengerId: userId, status: 'COMPLETED' as const },
        { challengeeId: userId, status: 'COMPLETED' as const },
      ],
    });

    let totalWins = 0;
    let totalLosses = 0;
    for (const match of completedMatches) {
      if (match.winnerId === userId) {
        totalWins++;
      } else if (match.winnerId) {
        totalLosses++;
      }
    }
    const totalMatches = totalWins + totalLosses;
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

    return {
      totalWins,
      totalLosses,
      winRate,
      totalXp,
      level,
      xpToNextLevel,
      leaderboardRankings,
    };
  }

  async getGlobalRecentWins(limit: number = 10): Promise<GlobalRecentWin[]> {
    const recentMatches = await this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.winner', 'winner')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('match.status = :status', { status: 'COMPLETED' })
      .andWhere('match.winnerId IS NOT NULL')
      .orderBy('match.updatedAt', 'DESC')
      .take(limit)
      .getMany();

    return recentMatches.map(match => {
      const winner = match.winner;
      const loser = match.winnerId === match.challengerId ? match.challengee : match.challenger;

      return {
        matchId: match.id,
        winner: {
          id: winner.id,
          username: winner.username,
          avatar: winner.avatar
        },
        loser: {
          id: loser.id,
          username: loser.username,
          avatar: loser.avatar
        },
        game: match.leaderboard.game.name,
        platform: match.leaderboard.platform.name,
        matchType: match.type,
        completedAt: match.updatedAt,
      };
    });
  }
}
