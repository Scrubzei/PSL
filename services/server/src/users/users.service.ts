import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Match } from '../matches/match.entity';
import { LeaderboardEntry } from '../leaderboards/leaderboard-entry.entity';
import * as bcrypt from 'bcrypt';

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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(LeaderboardEntry)
    private leaderboardEntriesRepository: Repository<LeaderboardEntry>,
  ) {}

  async create(email: string, password: string, username: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      username,
    });
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findByEmailOrUsername(identifier: string): Promise<User | undefined> {
    return this.usersRepository.findOne({
      where: [{ email: identifier }, { username: identifier }]
    });
  }

  async findById(id: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByDiscordId(discordId: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { discordId } });
  }

  async createFromDiscord(
    discordId: string,
    email: string,
    discordAvatar: string | null,
  ): Promise<User> {
    const user = this.usersRepository.create({
      discordId,
      email,
      discordAvatar,
      // username and password are null for Discord-only users initially
    });
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

  async isUsernameAvailable(username: string): Promise<boolean> {
    const existingUser = await this.findByUsername(username);
    return !existingUser;
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
}
