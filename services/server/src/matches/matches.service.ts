import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Match, MatchStatus } from './match.entity';
import { CreateMatchDto } from './dto/create-match.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { LeaderboardsService } from '../leaderboards/leaderboards.service';
import { BotzeiService } from '../botzei/botzei.service';
import { UsersService } from '../users/users.service';
import { initialEloRating } from '../leaderboards/elo.util';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    private notificationsService: NotificationsService,
    private leaderboardsService: LeaderboardsService,
    private botzeiService: BotzeiService,
    private usersService: UsersService,
  ) {}

  /** After COMPLETED + winnerId: apply XP Elo or ranked ladder reorder (idempotent per match flags). */
  async finalizeCompletedMatch(match: Match): Promise<Match> {
    const saved = await this.matchesRepository.save(match);
    if (saved.status !== 'COMPLETED' || !saved.winnerId) {
      return this.findOne(saved.id);
    }
    if (saved.type === 'XP') {
      await this.leaderboardsService.applyXpEloAfterMatchCompletion(saved.id);
    } else if (saved.type === 'RANKED') {
      await this.leaderboardsService.applyRankedLadderAfterMatchCompletion(saved.id);
    }
    return this.findOne(saved.id);
  }

  private async notifyStaffOfMatchDispute(match: Match): Promise<void> {
    const full = await this.findOne(match.id);
    const ids = await this.usersService.findUserIdsWithRoles(['ref', 'admin']);
    for (const uid of ids) {
      try {
        await this.notificationsService.create(
          uid,
          'DISPUTE_AWAITING_MODERATION',
          'Match needs moderation',
          `A result dispute needs review (${full.type}) for ${full.challenger.username} vs ${full.challengee?.username ?? '—'}.`,
          match.id,
          'MATCH',
        );
      } catch (e) {
        console.error('Failed to notify staff:', (e as Error).message);
      }
    }
  }

  async create(challengerId: string, createMatchDto: CreateMatchDto): Promise<Match> {
    const isOpenListing = createMatchDto.openListing === true;

    if (isOpenListing) {
      if (createMatchDto.type !== 'XP') {
        throw new BadRequestException('Open listings are only available for XP matches');
      }
      if (createMatchDto.challengeeId) {
        throw new BadRequestException('Open listings cannot include a challengee');
      }
    } else {
      if (!createMatchDto.challengeeId) {
        throw new BadRequestException('challengeeId is required unless creating an open listing');
      }
      if (challengerId === createMatchDto.challengeeId) {
        throw new BadRequestException('You cannot challenge yourself');
      }
    }

    if (createMatchDto.selectedMaps.length !== createMatchDto.bestOf) {
      throw new BadRequestException(`You must select exactly ${createMatchDto.bestOf} maps`);
    }

    if (!isOpenListing) {
      const existingChallenge = await this.matchesRepository
        .createQueryBuilder('match')
        .where('match.leaderboardId = :leaderboardId', { leaderboardId: createMatchDto.leaderboardId })
        .andWhere('match.type = :type', { type: createMatchDto.type })
        .andWhere('match.status IN (:...statuses)', { statuses: ['PENDING', 'ACCEPTED', 'DISPUTED'] })
        .andWhere(
          '((match.challengerId = :challengerId AND match.challengeeId = :challengeeId) OR ' +
            '(match.challengerId = :challengeeId AND match.challengeeId = :challengerId))',
          { challengerId, challengeeId: createMatchDto.challengeeId! },
        )
        .getOne();

      if (existingChallenge) {
        throw new BadRequestException({
          message:
            'There is already an active challenge between you and this player for this game mode. Please resolve it first.',
          existingChallengeId: existingChallenge.id,
        });
      }
    } else {
      const existingOpen = await this.matchesRepository.findOne({
        where: {
          challengerId,
          leaderboardId: createMatchDto.leaderboardId,
          type: 'XP',
          status: 'PENDING',
          challengeeId: IsNull(),
        },
      });
      if (existingOpen) {
        throw new BadRequestException({
          message: 'You already have an open XP listing for this leaderboard. Cancel it or wait until it is accepted.',
          existingChallengeId: existingOpen.id,
        });
      }
    }

    if (createMatchDto.type === 'XP') {
      const challengerEntry = await this.leaderboardsService.getUserEntry(
        challengerId,
        createMatchDto.leaderboardId,
      );
      if (isOpenListing) {
        if (!challengerEntry?.xpOptIn || challengerEntry.elo == null) {
          throw new BadRequestException('You must join the XP ladder for this leaderboard before posting an open match');
        }
      } else {
        const challengeeEntry = await this.leaderboardsService.getUserEntry(
          createMatchDto.challengeeId!,
          createMatchDto.leaderboardId,
        );
        if (!challengerEntry || !challengeeEntry) {
          throw new BadRequestException('Both players must be signed up for this leaderboard');
        }
        if (!challengerEntry.xpOptIn || !challengeeEntry.xpOptIn) {
          throw new BadRequestException('Both players must join the XP ladder for this leaderboard');
        }
      }
    } else if (createMatchDto.type === 'RANKED') {
      if (createMatchDto.bestOf !== 3) {
        throw new BadRequestException('Ranked matches must be best of 3');
      }
      try {
        await this.leaderboardsService.signup(challengerId, createMatchDto.leaderboardId);
      } catch (error) {
        if (!(error as Error).message?.includes('already signed up')) {
          console.error('Failed to sign up challenger for leaderboard:', (error as Error).message);
        }
      }
      const challengerEntry = await this.leaderboardsService.getUserEntry(
        challengerId,
        createMatchDto.leaderboardId,
      );
      const challengeeEntry = await this.leaderboardsService.getUserEntry(
        createMatchDto.challengeeId!,
        createMatchDto.leaderboardId,
      );
      if (!challengerEntry?.rankedOptIn || !challengeeEntry?.rankedOptIn) {
        throw new BadRequestException('Both players must be on the ranked ladder for this leaderboard');
      }
    }

    const match = this.matchesRepository.create({
      challengerId,
      leaderboardId: createMatchDto.leaderboardId,
      type: createMatchDto.type,
      bestOf: createMatchDto.bestOf,
      selectedMaps: createMatchDto.selectedMaps,
      wagerAmount: createMatchDto.wagerAmount,
      message: createMatchDto.message,
      linkOnly: createMatchDto.linkOnly,
      challengeeId: isOpenListing ? null : createMatchDto.challengeeId!,
      status: 'PENDING',
      shareToken: createMatchDto.linkOnly ? uuidv4() : undefined,
    });

    const savedMatch = await this.matchesRepository.save(match);
    const matchWithRelations = await this.findOne(savedMatch.id);

    if (!isOpenListing && createMatchDto.challengeeId) {
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

    if (match.status !== 'PENDING') {
      throw new BadRequestException('This challenge is no longer pending');
    }

    const isOpenListing = match.challengeeId == null;

    if (isOpenListing) {
      if (match.type !== 'XP') {
        throw new BadRequestException('This listing cannot be accepted');
      }
      if (userId === match.challengerId) {
        throw new BadRequestException('You cannot accept your own open match');
      }
      match.challengeeId = userId;
    } else if (match.challengeeId !== userId) {
      throw new ForbiddenException('Only the challengee can accept this challenge');
    }

    if (match.type !== 'XP') {
      try {
        await this.leaderboardsService.signup(userId, match.leaderboardId);
      } catch (error) {
        if (!error.message?.includes('already signed up')) {
          console.error('Failed to sign up challengee for leaderboard:', error.message);
        }
      }
    }

    if (match.type === 'XP') {
      const chEntry = await this.leaderboardsService.getUserEntry(match.challengerId, match.leaderboardId);
      const ceEntry = await this.leaderboardsService.getUserEntry(match.challengeeId!, match.leaderboardId);
      if (!chEntry?.xpOptIn || !ceEntry?.xpOptIn || chEntry.elo == null || ceEntry.elo == null) {
        throw new BadRequestException(
          'Both players must be on the XP ladder with an Elo rating. Join the XP ladder for this leaderboard first.',
        );
      }
      match.challengerEloBefore = chEntry.elo;
      match.challengeeEloBefore = ceEntry.elo;
      match.disputePhase = 'NONE';
    }

    match.status = 'ACCEPTED';
    match.acceptedAt = new Date();
    await this.matchesRepository.save(match);
    const full = await this.findOne(match.id);

    try {
      await this.notificationsService.create(
        match.challengerId,
        'CHALLENGE_ACCEPTED',
        'Challenge Accepted',
        `${full.challengee!.username} has accepted your challenge!`,
        match.id,
        'MATCH',
      );
    } catch (error) {
      console.error('Failed to create accept notification:', error.message);
    }

    return full;
  }

  async decline(id: string, userId: string): Promise<Match> {
    const match = await this.findOne(id);

    if (match.challengeeId == null) {
      throw new BadRequestException('Open listings cannot be declined — wait for an opponent or ask the host to cancel');
    }

    if (match.challengeeId !== userId) {
      throw new ForbiddenException('Only the challengee can decline this challenge');
    }

    if (match.status !== 'PENDING') {
      throw new BadRequestException('This challenge is no longer pending');
    }

    match.status = 'DECLINED';
    const updatedMatch = await this.matchesRepository.save(match);

    try {
      await this.notificationsService.create(
        match.challengerId,
        'CHALLENGE_DECLINED',
        'Challenge Declined',
        `${match.challengee!.username} has declined your challenge.`,
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

    if (match.challengeeId) {
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
    }

    return updatedMatch;
  }

  /** XP open listings pending an opponent (matchfinder browse). */
  async findXpOpenForLeaderboard(leaderboardId: string, limit = 50): Promise<Match[]> {
    return this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('match.leaderboardId = :leaderboardId', { leaderboardId })
      .andWhere('match.type = :type', { type: 'XP' })
      .andWhere('match.status = :status', { status: 'PENDING' })
      .andWhere('match.challengeeId IS NULL')
      .orderBy('match.createdAt', 'DESC')
      .take(limit)
      .getMany();
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

        return this.finalizeCompletedMatch(match);
      } else {
        // Disagreement! Create a dispute
        match.status = 'DISPUTED';
        if (match.type === 'XP' || match.type === 'RANKED') {
          match.disputePhase = 'AWAITING_REF';
          await this.notifyStaffOfMatchDispute(match);
        }

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

  async moderateMatch(moderatorId: string, matchId: string, winnerId: string): Promise<Match> {
    const moderator = await this.usersService.findById(moderatorId);
    if (!moderator) {
      throw new NotFoundException('User not found');
    }
    const match = await this.findOne(matchId);

    if (match.status !== 'DISPUTED') {
      throw new BadRequestException('This match is not in dispute');
    }
    if (winnerId !== match.challengerId && winnerId !== match.challengeeId) {
      throw new BadRequestException('Invalid winner ID');
    }

    const isAdmin = moderator.role === 'admin';
    const isRef = moderator.role === 'ref';

    if (match.disputePhase === 'AWAITING_ADMIN') {
      if (!isAdmin) {
        throw new ForbiddenException('Only admins can resolve this dispute');
      }
      match.winnerId = winnerId;
      match.status = 'COMPLETED';
      match.disputePhase = 'FINAL';
      match.adminResolvedByUserId = moderatorId;
    } else if (match.disputePhase === 'AWAITING_REF' || match.disputePhase === 'NONE') {
      if (!isAdmin && !isRef) {
        throw new ForbiddenException('Only refs or admins can resolve this dispute');
      }
      match.winnerId = winnerId;
      match.status = 'COMPLETED';
      if (match.type === 'XP' || match.type === 'RANKED') {
        // Refs (including users who are both ref and admin) get REF_DECIDED so players can
        // appeal to a pure admin. Only admin-only moderators seal the match as FINAL.
        if (isRef) {
          match.disputePhase = 'REF_DECIDED';
          match.refResolvedByUserId = moderatorId;
          match.adminResolvedByUserId = null;
        } else if (isAdmin) {
          match.disputePhase = 'FINAL';
          match.adminResolvedByUserId = moderatorId;
        }
      } else {
        match.disputePhase = 'FINAL';
      }
    } else {
      throw new BadRequestException('This match is not awaiting moderation');
    }

    const winner = winnerId === match.challengerId ? match.challenger : match.challengee;
    const loser = winnerId === match.challengerId ? match.challengee : match.challenger;

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

    return this.finalizeCompletedMatch(match);
  }

  async disputeRefDecision(userId: string, matchId: string): Promise<Match> {
    const match = await this.findOne(matchId);
    if (match.type !== 'XP' && match.type !== 'RANKED') {
      throw new BadRequestException('This match type does not support ref appeal');
    }
    if (match.status !== 'COMPLETED') {
      throw new BadRequestException('You cannot dispute this match result');
    }
    if (userId !== match.challengerId && userId !== match.challengeeId) {
      throw new ForbiddenException('Only match participants can dispute a ref decision');
    }
    if (match.adminResolvedByUserId) {
      throw new BadRequestException('Cannot dispute an admin decision');
    }
    const refRulingAppealable =
      match.disputePhase === 'REF_DECIDED' ||
      (match.disputePhase === 'FINAL' && !!match.refResolvedByUserId && !match.adminResolvedByUserId);
    if (!refRulingAppealable) {
      throw new BadRequestException('You cannot dispute this match result');
    }

    if (match.type === 'XP') {
      await this.leaderboardsService.rollbackXpEloForMatch(matchId);
    } else {
      await this.leaderboardsService.rollbackRankedLadderForMatch(matchId);
    }
    const m = await this.findOne(matchId);
    m.winnerId = null;
    m.status = 'DISPUTED';
    m.disputePhase = 'AWAITING_ADMIN';
    await this.matchesRepository.save(m);

    const adminIds = await this.usersService.findUserIdsWithRoles(['admin']);
    for (const uid of adminIds) {
      try {
        await this.notificationsService.create(
          uid,
          'REF_DECISION_DISPUTED',
          'Ref decision disputed',
          `Players disputed the ref ruling on match ${match.id}. Admin review required.`,
          match.id,
          'MATCH',
        );
      } catch (e) {
        console.error('Failed to notify admin:', (e as Error).message);
      }
    }

    return this.findOne(matchId);
  }

  async getModerationQueue(userRole: 'ref' | 'admin'): Promise<Match[]> {
    const qb = this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('match.status = :status', { status: 'DISPUTED' });

    if (userRole === 'ref') {
      qb.andWhere('match.disputePhase = :phase', { phase: 'AWAITING_REF' });
    } else {
      qb.andWhere('match.disputePhase IN (:...phases)', {
        phases: ['AWAITING_REF', 'AWAITING_ADMIN'],
      });
    }

    return qb.orderBy('match.updatedAt', 'ASC').getMany();
  }

  async createCompleted(data: {
    challengerId: string;
    challengeeId: string;
    winnerId: string;
    leaderboardId: string;
    map: string;
  }): Promise<Match> {
    const chEntry = await this.leaderboardsService.getUserEntry(data.challengerId, data.leaderboardId);
    const ceEntry = await this.leaderboardsService.getUserEntry(data.challengeeId, data.leaderboardId);
    const chElo = chEntry?.elo ?? initialEloRating;
    const ceElo = ceEntry?.elo ?? initialEloRating;

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
      challengerEloBefore: chElo,
      challengeeEloBefore: ceElo,
      disputePhase: 'FINAL',
    });

    const saved = await this.matchesRepository.save(match);
    await this.leaderboardsService.applyXpEloAfterMatchCompletion(saved.id);
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

    return this.finalizeCompletedMatch(match);
  }

  /** Challenger may edit maps (and best-of, fixed to 3 for ranked) while match is PENDING. */
  async updatePendingByChallenger(
    matchId: string,
    challengerId: string,
    body: { bestOf?: number; selectedMaps: string[] },
  ): Promise<Match> {
    const match = await this.findOne(matchId);
    if (match.challengerId !== challengerId) {
      throw new ForbiddenException('Only the challenger can update this challenge');
    }
    if (match.status !== 'PENDING') {
      throw new BadRequestException('This challenge can no longer be edited');
    }
    const bestOf = body.bestOf ?? match.bestOf;
    if (match.type === 'RANKED' && bestOf !== 3) {
      throw new BadRequestException('Ranked matches must be best of 3');
    }
    if (body.selectedMaps.length !== bestOf) {
      throw new BadRequestException(`You must select exactly ${bestOf} maps`);
    }
    match.bestOf = bestOf;
    match.selectedMaps = body.selectedMaps;
    await this.matchesRepository.save(match);
    return this.findOne(matchId);
  }

  /** Cross-game feed: recent PENDING / ACCEPTED matches (e.g. matchfinder). */
  async publicFeed(params: { limit?: number; statuses?: MatchStatus[] }): Promise<Match[]> {
    const limit = Math.min(params.limit ?? 50, 100);
    const statuses = params.statuses?.length ? params.statuses : (['PENDING', 'ACCEPTED'] as MatchStatus[]);
    const qb = this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.challenger', 'challenger')
      .leftJoinAndSelect('match.challengee', 'challengee')
      .leftJoinAndSelect('match.leaderboard', 'leaderboard')
      .leftJoinAndSelect('leaderboard.game', 'game')
      .leftJoinAndSelect('leaderboard.platform', 'platform')
      .where('match.status IN (:...statuses)', { statuses })
      .orderBy('match.updatedAt', 'DESC')
      .take(limit);
    return qb.getMany();
  }

  /**
   * Auto-cancel ACCEPTED matches with no reports after deadline, or complete when only one side reported.
   * Env: MATCH_REPORT_DEADLINE_RANKED_HOURS (default 24), MATCH_REPORT_DEADLINE_XP_HOURS (default 3).
   */
  async autoResolveStaleReports(): Promise<void> {
    const rankedH = parseFloat(process.env.MATCH_REPORT_DEADLINE_RANKED_HOURS || '24');
    const xpH = parseFloat(process.env.MATCH_REPORT_DEADLINE_XP_HOURS || '3');
    const now = Date.now();

    const matches = await this.matchesRepository.find({
      where: { status: 'ACCEPTED' as const },
      relations: ['challenger', 'challengee', 'leaderboard', 'leaderboard.game', 'leaderboard.platform'],
    });

    for (const match of matches) {
      if (!match.acceptedAt) continue;

      const hours = match.type === 'RANKED' ? rankedH : xpH;
      const deadlineMs = new Date(match.acceptedAt).getTime() + hours * 3600 * 1000;
      if (deadlineMs >= now) continue;

      const chRep = !!match.challengerReportedWinnerId;
      const ceRep = !!match.challengeeReportedWinnerId;

      if (!chRep && !ceRep) {
        match.status = 'CANCELLED';
        await this.matchesRepository.save(match);
        continue;
      }

      if (chRep && ceRep) {
        continue;
      }

      const reportedWinnerId = chRep ? match.challengerReportedWinnerId! : match.challengeeReportedWinnerId!;
      match.winnerId = reportedWinnerId;
      match.status = 'COMPLETED';
      await this.finalizeCompletedMatch(match);
    }
  }
}
