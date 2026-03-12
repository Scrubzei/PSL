import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Match, MatchStatus } from './match.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { LeaderboardsService } from '../leaderboards/leaderboards.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    private notificationsService: NotificationsService,
    private leaderboardsService: LeaderboardsService,
  ) {}

  async create(challengerId: string, createMatchDto: CreateMatchDto): Promise<Match> {
    if (challengerId === createMatchDto.challengeeId) {
      throw new BadRequestException('You cannot challenge yourself');
    }

    if (createMatchDto.selectedMaps.length !== createMatchDto.bestOf) {
      throw new BadRequestException(`You must select exactly ${createMatchDto.bestOf} maps`);
    }

    // Check for existing pending/accepted challenge between these users on same leaderboard and type
    const existingChallenge = await this.matchesRepository
      .createQueryBuilder('match')
      .where('match.leaderboardId = :leaderboardId', { leaderboardId: createMatchDto.leaderboardId })
      .andWhere('match.type = :type', { type: createMatchDto.type })
      .andWhere('match.status IN (:...statuses)', { statuses: ['PENDING', 'ACCEPTED', 'DISPUTED'] })
      .andWhere(
        '((match.challengerId = :challengerId AND match.challengeeId = :challengeeId) OR ' +
        '(match.challengerId = :challengeeId AND match.challengeeId = :challengerId))',
        { challengerId, challengeeId: createMatchDto.challengeeId }
      )
      .getOne();

    if (existingChallenge) {
      throw new BadRequestException({
        message: 'There is already an active challenge between you and this player for this game mode. Please resolve it first.',
        existingChallengeId: existingChallenge.id,
      });
    }

    // Auto sign up challenger for the leaderboard
    try {
      await this.leaderboardsService.signup(challengerId, createMatchDto.leaderboardId);
    } catch (error) {
      // Ignore if already signed up
      if (!error.message?.includes('already signed up')) {
        console.error('Failed to sign up challenger for leaderboard:', error.message);
      }
    }

    const match = this.matchesRepository.create({
      challengerId,
      ...createMatchDto,
      status: 'PENDING',
      shareToken: createMatchDto.linkOnly ? uuidv4() : undefined,
    });

    const savedMatch = await this.matchesRepository.save(match);

    // Load relations for notification
    const matchWithRelations = await this.findOne(savedMatch.id);

    // Create notification for challengee
    try {
      await this.notificationsService.create(
        createMatchDto.challengeeId,
        'CHALLENGE_RECEIVED',
        'New Challenge',
        `${matchWithRelations.challenger.username} has challenged you to a ${createMatchDto.type} match!`,
        savedMatch.id,
        'MATCH',
      );
    } catch (error) {
      console.error('Failed to create notification:', error.message);
    }

    return matchWithRelations;
  }

  async search(params: {
    userId?: string;
    opponentId?: string;
    status?: MatchStatus;
    game?: string;
    platform?: string;
    type?: 'XP' | 'RANKED';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Match[]> {
    const query = this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .orderBy('match.updatedAt', 'DESC');

    if (params.userId) {
      if (params.opponentId) {
        // Head to head
        query.andWhere(
          '((match.challengerId = :userId AND match.challengeeId = :opponentId) OR (match.challengerId = :opponentId AND match.challengeeId = :userId))',
          { userId: params.userId, opponentId: params.opponentId }
        );
      } else {
        query.andWhere('(match.challengerId = :userId OR match.challengeeId = :userId)', { userId: params.userId });
      }
    }

    if (params.status) {
      query.andWhere('match.status = :status', { status: params.status });
    }

    if (params.type) {
      query.andWhere('match.type = :type', { type: params.type });
    }

    if (params.game) {
      query.andWhere('LOWER(game.name) = LOWER(:game)', { game: params.game });
    }

    if (params.platform) {
      query.andWhere('LOWER(platform.name) = LOWER(:platform)', { platform: params.platform });
    }

    if (params.startDate) {
      query.andWhere('match.updatedAt >= :startDate', { startDate: params.startDate });
    }

    if (params.endDate) {
      query.andWhere('match.updatedAt <= :endDate', { endDate: params.endDate });
    }

    if (params.limit) {
      query.take(params.limit);
    }

    return query.getMany();
  }

  async findAllForUser(
    userId: string,
    status?: MatchStatus,
    role?: 'challenger' | 'challengee',
  ): Promise<Match[]> {
    const query = this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .orderBy('match.createdAt', 'DESC');

    if (role === 'challenger') {
      query.where('match.challengerId = :userId', { userId });
    } else if (role === 'challengee') {
      query.where('match.challengeeId = :userId', { userId });
    } else {
      query.where('(match.challengerId = :userId OR match.challengeeId = :userId)', { userId });
    }

    if (status) {
      query.andWhere('match.status = :status', { status });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Match> {
    const match = await this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('match.id = :id', { id })
      .getOne();

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  async findByShareToken(shareToken: string): Promise<Match> {
    const match = await this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('match.shareToken = :shareToken', { shareToken })
      .getOne();

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  async accept(id: string, userId: string): Promise<Match> {
    const match = await this.findOne(id);

    if (match.challengeeId !== userId) {
      throw new ForbiddenException('Only the challengee can accept this challenge');
    }

    if (match.status !== 'PENDING') {
      throw new BadRequestException('This challenge is no longer pending');
    }

    // Auto sign up challengee for the leaderboard
    try {
      await this.leaderboardsService.signup(userId, match.leaderboardId);
    } catch (error) {
      // Ignore if already signed up
      if (!error.message?.includes('already signed up')) {
        console.error('Failed to sign up challengee for leaderboard:', error.message);
      }
    }

    match.status = 'ACCEPTED';
    const updatedMatch = await this.matchesRepository.save(match);

    // Notify challenger
    try {
      await this.notificationsService.create(
        match.challengerId,
        'CHALLENGE_ACCEPTED',
        'Challenge Accepted',
        `${match.challengee.username} has accepted your challenge!`,
        match.id,
        'MATCH',
      );
    } catch (error) {
      console.error('Failed to create accept notification:', error.message);
    }

    return updatedMatch;
  }

  async decline(id: string, userId: string): Promise<Match> {
    const match = await this.findOne(id);

    if (match.challengeeId !== userId) {
      throw new ForbiddenException('Only the challengee can decline this challenge');
    }

    if (match.status !== 'PENDING') {
      throw new BadRequestException('This challenge is no longer pending');
    }

    match.status = 'DECLINED';
    const updatedMatch = await this.matchesRepository.save(match);

    // Notify challenger
    try {
      await this.notificationsService.create(
        match.challengerId,
        'CHALLENGE_DECLINED',
        'Challenge Declined',
        `${match.challengee.username} has declined your challenge.`,
        match.id,
        'MATCH',
      );
    } catch (error) {
      console.error('Failed to create decline notification:', error.message);
    }

    return updatedMatch;
  }

  async cancel(id: string, userId: string): Promise<Match> {
    const match = await this.findOne(id);

    if (match.challengerId !== userId) {
      throw new ForbiddenException('Only the challenger can cancel this challenge');
    }

    if (match.status !== 'PENDING') {
      throw new BadRequestException('This challenge is no longer pending');
    }

    match.status = 'CANCELLED';
    const updatedMatch = await this.matchesRepository.save(match);

    // Notify challengee
    try {
      await this.notificationsService.create(
        match.challengeeId,
        'CHALLENGE_CANCELLED',
        'Challenge Cancelled',
        `${match.challenger.username} has cancelled their challenge.`,
        match.id,
        'MATCH',
      );
    } catch (error) {
      console.error('Failed to create cancel notification:', error.message);
    }

    return updatedMatch;
  }

  async reportResult(
    id: string,
    userId: string,
    reportedWinnerId: string,
    mapResults: { mapName: string; winner: 'challenger' | 'challengee' }[],
  ): Promise<Match> {
    const match = await this.findOne(id);

    // Verify user is part of this match
    const isChallenger = match.challengerId === userId;
    const isChallengee = match.challengeeId === userId;

    if (!isChallenger && !isChallengee) {
      throw new ForbiddenException('You are not part of this match');
    }

    if (match.status !== 'ACCEPTED' && match.status !== 'DISPUTED') {
      throw new BadRequestException('This match cannot receive result reports');
    }

    // Validate reported winner is one of the players
    if (reportedWinnerId !== match.challengerId && reportedWinnerId !== match.challengeeId) {
      throw new BadRequestException('Invalid winner ID');
    }

    // Store the report based on who is reporting
    if (isChallenger) {
      match.challengerReportedWinnerId = reportedWinnerId;
      match.challengerReportedMapResults = mapResults;
    } else {
      match.challengeeReportedWinnerId = reportedWinnerId;
      match.challengeeReportedMapResults = mapResults;
    }

    // Check if player reported their opponent as winner (conceding)
    // If so, auto-complete the match - no need for opponent to confirm
    const reporterConceded = (isChallenger && reportedWinnerId === match.challengeeId) ||
                              (isChallengee && reportedWinnerId === match.challengerId);

    if (reporterConceded) {
      match.winnerId = reportedWinnerId;
      match.status = 'COMPLETED';

      const winner = reportedWinnerId === match.challengerId
        ? match.challenger
        : match.challengee;
      const loser = reportedWinnerId === match.challengerId
        ? match.challengee
        : match.challenger;

      // Notify both players of completion
      try {
        await this.notificationsService.create(
          winner.id,
          'MATCH_COMPLETED',
          'Match Completed',
          `Congratulations! You won the match against ${loser.username}!`,
          match.id,
          'MATCH',
        );
        await this.notificationsService.create(
          loser.id,
          'MATCH_COMPLETED',
          'Match Completed',
          `Your match against ${winner.username} has been completed.`,
          match.id,
          'MATCH',
        );
      } catch (error) {
        console.error('Failed to create completion notifications:', error.message);
      }

      return this.matchesRepository.save(match);
    }

    // Check if both players have reported
    if (match.challengerReportedWinnerId && match.challengeeReportedWinnerId) {
      // Both reported - check if they agree
      if (match.challengerReportedWinnerId === match.challengeeReportedWinnerId) {
        // Agreement! Resolve the match
        match.winnerId = match.challengerReportedWinnerId;
        match.status = 'COMPLETED';

        const winner = match.challengerReportedWinnerId === match.challengerId
          ? match.challenger
          : match.challengee;
        const loser = match.challengerReportedWinnerId === match.challengerId
          ? match.challengee
          : match.challenger;

        // Notify both players of completion
        try {
          await this.notificationsService.create(
            winner.id,
            'MATCH_COMPLETED',
            'Match Completed',
            `Congratulations! You won the match against ${loser.username}!`,
            match.id,
            'MATCH',
          );
          await this.notificationsService.create(
            loser.id,
            'MATCH_COMPLETED',
            'Match Completed',
            `Your match against ${winner.username} has been completed.`,
            match.id,
            'MATCH',
          );
        } catch (error) {
          console.error('Failed to create completion notifications:', error.message);
        }
      } else {
        // Disagreement! Create a dispute
        match.status = 'DISPUTED';

        // Notify both players of the dispute
        try {
          await this.notificationsService.create(
            match.challengerId,
            'MATCH_DISPUTED',
            'Match Disputed',
            `There is a dispute in your match against ${match.challengee.username}. Results don't match.`,
            match.id,
            'MATCH',
          );
          await this.notificationsService.create(
            match.challengeeId,
            'MATCH_DISPUTED',
            'Match Disputed',
            `There is a dispute in your match against ${match.challenger.username}. Results don't match.`,
            match.id,
            'MATCH',
          );
        } catch (error) {
          console.error('Failed to create dispute notifications:', error.message);
        }
      }
    }

    return this.matchesRepository.save(match);
  }

  async resolveDispute(id: string, winnerId: string): Promise<Match> {
    const match = await this.findOne(id);

    if (match.status !== 'DISPUTED') {
      throw new BadRequestException('This match is not in dispute');
    }

    if (winnerId !== match.challengerId && winnerId !== match.challengeeId) {
      throw new BadRequestException('Invalid winner ID');
    }

    match.winnerId = winnerId;
    match.status = 'COMPLETED';

    const winner = winnerId === match.challengerId ? match.challenger : match.challengee;
    const loser = winnerId === match.challengerId ? match.challengee : match.challenger;

    // Notify both players
    try {
      await this.notificationsService.create(
        winner.id,
        'DISPUTE_RESOLVED',
        'Dispute Resolved',
        `The dispute has been resolved. You won the match against ${loser.username}!`,
        match.id,
        'MATCH',
      );
      await this.notificationsService.create(
        loser.id,
        'DISPUTE_RESOLVED',
        'Dispute Resolved',
        `The dispute has been resolved. ${winner.username} has been declared the winner.`,
        match.id,
        'MATCH',
      );
    } catch (error) {
      console.error('Failed to create dispute resolution notifications:', error.message);
    }

    return this.matchesRepository.save(match);
  }

  async createCompleted(data: {
    challengerId: string;
    challengeeId: string;
    winnerId: string;
    leaderboardId: string;
    map: string;
  }): Promise<Match> {
    const match = this.matchesRepository.create({
      challengerId: data.challengerId,
      challengeeId: data.challengeeId,
      winnerId: data.winnerId,
      leaderboardId: data.leaderboardId,
      type: 'XP',
      status: 'COMPLETED',
      bestOf: 1,
      selectedMaps: [data.map],
      challengerReportedWinnerId: data.winnerId,
      challengeeReportedWinnerId: data.winnerId,
    });

    const saved = await this.matchesRepository.save(match);
    return this.findOne(saved.id);
  }

  async concedeDispute(id: string, userId: string): Promise<Match> {
    const match = await this.findOne(id);

    if (match.status !== 'DISPUTED') {
      throw new BadRequestException('This match is not in dispute');
    }

    const isChallenger = match.challengerId === userId;
    const isChallengee = match.challengeeId === userId;

    if (!isChallenger && !isChallengee) {
      throw new ForbiddenException('You are not part of this match');
    }

    // User is agreeing with opponent's report, so opponent wins
    const opponentReportedWinnerId = isChallenger
      ? match.challengeeReportedWinnerId
      : match.challengerReportedWinnerId;

    if (!opponentReportedWinnerId) {
      throw new BadRequestException('Opponent has not reported a result');
    }

    match.winnerId = opponentReportedWinnerId;
    match.status = 'COMPLETED';

    const winner = opponentReportedWinnerId === match.challengerId
      ? match.challenger
      : match.challengee;
    const loser = opponentReportedWinnerId === match.challengerId
      ? match.challengee
      : match.challenger;

    // Notify both players
    try {
      await this.notificationsService.create(
        winner.id,
        'DISPUTE_RESOLVED',
        'Dispute Resolved',
        `${loser.username} has conceded. You won the match!`,
        match.id,
        'MATCH',
      );
      await this.notificationsService.create(
        loser.id,
        'DISPUTE_RESOLVED',
        'Dispute Resolved',
        `You conceded the dispute. ${winner.username} has been declared the winner.`,
        match.id,
        'MATCH',
      );
    } catch (error) {
      console.error('Failed to create concede notifications:', error.message);
    }

    return this.matchesRepository.save(match);
  }
}
