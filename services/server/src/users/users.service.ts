import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  game: string;
  /** 'FINAL' for completed history results; 'LIVE' reserved for in-progress matches. */
  status: string;
  team1: string;
  team2: string;
  players1: string[];
  players2: string[];
  /** Winning team name (equals team1 or team2), or null if undecided. */
  winner: string | null;
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
    private configService: ConfigService,
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

  async updateProfile(userId: string, data: { plutoniumUsername?: string; xboxGamertag?: string; ps3Username?: string; activisionId?: string; psnUsername?: string }): Promise<User> {
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
    if (data.ps3Username !== undefined) {
      user.ps3Username = data.ps3Username;
    }
    if (data.activisionId !== undefined) {
      user.activisionId = data.activisionId;
    }
    if (data.psnUsername !== undefined) {
      user.psnUsername = data.psnUsername;
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

      const rankedIdx = entry.rankedOptIn
        ? allRankedEntries.findIndex(e => e.userId === userId)
        : -1;
      const rank =
        entry.rankedOptIn && rankedIdx >= 0 ? rankedIdx + 1 : null;
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

  private readonly logger = new Logger(UsersService.name);
  private static readonly NEATQUEUE_BASE = 'https://api.neatqueue.com/api/v1';
  /** How far back to pull match history for the live activity feed. */
  private static readonly NEATQUEUE_LOOKBACK_DAYS = 14;
  /** In-memory cache of the mapped feed so every dashboard load doesn't hit NeatQueue. */
  private neatQueueCache: { expires: number; wins: GlobalRecentWin[] } | null = null;
  /** Short TTL so in-progress (LIVE) matches stay fresh; ~matches the frontend poll. */
  private static readonly NEATQUEUE_CACHE_TTL_MS = 30_000;

  async getGlobalRecentWins(limit: number = 10): Promise<GlobalRecentWin[]> {
    const token = this.configService.get<string>('NEATQUEUE_API_TOKEN');
    const serverId = this.configService.get<string>('NEATQUEUE_SERVER_ID');

    // Prefer real NeatQueue data (LIVE in-progress + FINAL history); fall back to
    // local matches if it's unconfigured or unreachable so the feed never hard-fails.
    if (token && serverId) {
      try {
        const wins = await this.getNeatQueueFeed(token, serverId);
        return wins.slice(0, limit);
      } catch (err) {
        this.logger.warn(`NeatQueue feed unavailable, falling back to DB: ${err instanceof Error ? err.message : err}`);
      }
    }

    return this.getGlobalRecentWinsFromDb(limit);
  }

  /**
   * Builds the activity feed from NeatQueue: in-progress matches (LIVE) first,
   * then recent completed results (FINAL). Cached briefly so dashboard loads don't
   * hammer the API. LIVE matches drive the cache TTL down since they change fast.
   */
  private async getNeatQueueFeed(token: string, serverId: string): Promise<GlobalRecentWin[]> {
    if (this.neatQueueCache && this.neatQueueCache.expires > Date.now()) {
      return this.neatQueueCache.wins;
    }

    const since = new Date(Date.now() - UsersService.NEATQUEUE_LOOKBACK_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);

    // Fetch both sources concurrently; a LIVE failure shouldn't sink the FINAL feed.
    const [liveRows, historyRows] = await Promise.all([
      this.fetchNeatQueueRows(`${UsersService.NEATQUEUE_BASE}/matches/${serverId}`, token,
        p => (Array.isArray(p) ? p : Object.values(p ?? {})),
      ).catch(err => {
        this.logger.warn(`NeatQueue live matches unavailable: ${err instanceof Error ? err.message : err}`);
        return [] as any[];
      }),
      this.fetchNeatQueueRows(`${UsersService.NEATQUEUE_BASE}/history/${serverId}?start_date=${since}`, token,
        p => (Array.isArray(p?.data) ? p.data : []),
      ),
    ]);

    // In-progress matches only carry the queue *channel*, not the clean queue name
    // ("Bo1 Comp"); build a channel-id -> game map from history to label them.
    const queueGame = new Map<string, string>();
    for (const r of historyRows) {
      const chId = this.queueChannelId(r);
      if (chId && r?.game && !queueGame.has(chId)) queueGame.set(chId, r.game);
    }

    const live = liveRows
      .map(row => this.mapMatchRow(row, 'LIVE', queueGame))
      .filter((w): w is GlobalRecentWin => w !== null);
    const final = historyRows
      .map(row => this.mapMatchRow(row, 'FINAL', queueGame))
      .filter((w): w is GlobalRecentWin => w !== null)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

    const wins = [...live, ...final];
    this.neatQueueCache = { expires: Date.now() + UsersService.NEATQUEUE_CACHE_TTL_MS, wins };
    return wins;
  }

  /** Fetches + sanitizes a NeatQueue JSON endpoint and extracts the row list. */
  private async fetchNeatQueueRows(url: string, token: string, extract: (parsed: any) => any[]): Promise<any[]> {
    const res = await fetch(url, { headers: { Authorization: token } });
    if (!res.ok) {
      throw new Error(`NeatQueue request ${url} returned ${res.status}`);
    }
    // NeatQueue occasionally emits invalid backslash escapes in free-text fields
    // (player names, messages), so sanitize before parsing.
    const parsed = JSON.parse(this.sanitizeNeatQueueJson(await res.text()));
    return extract(parsed);
  }

  /** queue_channel is a plain id string in history, but an object in live matches. */
  private queueChannelId(row: any): string | null {
    const qc = row?.queue_channel;
    if (typeof qc === 'string') return qc;
    return qc?.id ?? row?.queue_channel_id ?? null;
  }

  /** Strips NeatQueue's decorative channel-name formatting, e.g. "【⚫】𝐁𝐎𝟏" -> "BO1". */
  private cleanQueueName(name?: string): string | null {
    if (!name) return null;
    const cleaned = name.normalize('NFKC').replace(/【.*?】/g, '').replace(/[|]/g, '').trim();
    return cleaned || null;
  }

  /**
   * Maps a NeatQueue match (history row or in-progress match) to a feed item.
   * Returns null if it isn't a two-team match, or if it's FINAL without a decided winner.
   */
  private mapMatchRow(row: any, status: 'LIVE' | 'FINAL', queueGame: Map<string, string>): GlobalRecentWin | null {
    const teams: any[][] = Array.isArray(row?.teams) ? row.teams : [];
    if (teams.length !== 2) return null;

    // winner is the winning team index; -1/out-of-range means undecided.
    const winnerIdx: number = typeof row?.winner === 'number' ? row.winner : -1;
    const decided = winnerIdx >= 0 && winnerIdx < teams.length;
    if (status === 'FINAL' && !decided) return null;

    const teamNames: string[] = Array.isArray(row?.team_names) ? row.team_names : [];
    const roster = (team: any[]): string[] =>
      (Array.isArray(team) ? team : []).map(p => p?.name).filter((n): n is string => !!n);
    const teamLabel = (team: any[], idx: number): string => {
      const players = Array.isArray(team) ? team : [];
      const captain =
        players.find(p => p?.name && p.name === teamNames[idx]) ??
        players.find(p => p?.captain === true) ??
        players[0];
      return teamNames[idx] || captain?.name || `Team ${idx + 1}`;
    };

    const team1 = teamLabel(teams[0], 0);
    const team2 = teamLabel(teams[1], 1);
    const players1 = roster(teams[0]);
    const players2 = roster(teams[1]);
    if (!players1.length || !players2.length) return null;

    const rawTime: string = row?.time ?? '';
    const parsedTime = rawTime ? new Date(rawTime.includes('T') ? rawTime : `${rawTime.replace(' ', 'T')}Z`) : null;
    const completedAt = parsedTime && !isNaN(parsedTime.getTime()) ? parsedTime : new Date();

    // Live matches lack the clean queue name; resolve via the channel->game map,
    // then fall back to the (de-formatted) channel name.
    const chId = this.queueChannelId(row);
    const game =
      row?.game ??
      (chId ? queueGame.get(chId) : undefined) ??
      this.cleanQueueName(row?.queue_channel?.name) ??
      'Live Match';

    // channel is a string id in history but an object in live matches.
    const channelId = typeof row?.channel === 'string' ? row.channel : (row?.channel?.id ?? row?.channel_id);

    return {
      matchId: String(channelId ?? `${row?.guild_id}-${row?.game_num}`),
      game,
      status,
      team1,
      team2,
      players1,
      players2,
      winner: decided ? (winnerIdx === 0 ? team1 : team2) : null,
      completedAt,
    };
  }

  /**
   * Doubles any backslash that doesn't begin a valid JSON escape (`\uXXXX` or `\"\\/bfnrt`),
   * repairing the malformed escapes NeatQueue sometimes returns so JSON.parse succeeds.
   */
  private sanitizeNeatQueueJson(raw: string): string {
    return raw.replace(/\\(?:u[0-9a-fA-F]{4}|["\\/bfnrt])|\\/g, m => (m.length > 1 ? m : '\\\\'));
  }

  private async getGlobalRecentWinsFromDb(limit: number = 10): Promise<GlobalRecentWin[]> {
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
        game: match.leaderboard.game.name,
        status: 'FINAL',
        team1: winner.username,
        team2: loser.username,
        players1: [winner.username],
        players2: [loser.username],
        winner: winner.username,
        completedAt: match.updatedAt,
      };
    });
  }
}
