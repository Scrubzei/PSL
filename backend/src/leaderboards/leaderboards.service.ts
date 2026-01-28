import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Leaderboard } from './leaderboard.entity';
import { LeaderboardEntry } from './leaderboard-entry.entity';

export interface LeaderboardEntryWithRank {
  id: string;
  rank: number;
  userId: string;
  username: string;
  xp: number;
  rankScore: number;
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
    // Check if leaderboard exists
    await this.findById(leaderboardId);

    // Check if user is already signed up
    const existing = await this.leaderboardEntriesRepository.findOne({
      where: { userId, leaderboardId },
    });

    if (existing) {
      throw new ConflictException('You are already signed up for this leaderboard');
    }

    // Find the lowest rank score currently in the leaderboard to place new user below
    const lowestEntry = await this.leaderboardEntriesRepository
      .createQueryBuilder('entry')
      .where('entry.leaderboardId = :leaderboardId', { leaderboardId })
      .orderBy('entry.rankScore', 'ASC')
      .getOne();

    // If there are existing entries, new user gets a rank score 100 below the lowest
    // Otherwise start at 1000 (default)
    const rankScore = lowestEntry ? Math.max(lowestEntry.rankScore - 100, 100) : 1000;

    const entry = this.leaderboardEntriesRepository.create({
      userId,
      leaderboardId,
      xp: 0,
      rankScore,
      wins: 0,
      losses: 0,
    });

    return this.leaderboardEntriesRepository.save(entry);
  }

  async getEntries(leaderboardId: string, type: 'ranked' | 'xp'): Promise<LeaderboardEntryWithRank[]> {
    // Check if leaderboard exists
    await this.findById(leaderboardId);

    const query = this.leaderboardEntriesRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.user', 'user')
      .where('entry.leaderboardId = :leaderboardId', { leaderboardId });

    // Sort by score (desc), then by createdAt (asc) for ties
    if (type === 'ranked') {
      query.orderBy('entry.rankScore', 'DESC').addOrderBy('entry.createdAt', 'ASC');
    } else {
      query.orderBy('entry.xp', 'DESC').addOrderBy('entry.createdAt', 'ASC');
    }

    const entries = await query.getMany();

    // Add rank numbers
    return entries.map((entry, index) => ({
      id: entry.id,
      rank: index + 1,
      userId: entry.userId,
      username: entry.user.username,
      xp: entry.xp,
      rankScore: entry.rankScore,
      wins: entry.wins,
      losses: entry.losses,
      createdAt: entry.createdAt,
    }));
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
}
