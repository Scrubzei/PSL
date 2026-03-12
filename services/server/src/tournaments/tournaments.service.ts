import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Tournament } from './tournament.entity';
import { TournamentParticipant } from './tournament-participant.entity';
import { TournamentMatch } from './tournament-match.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { BotzeiService } from '../botzei/botzei.service';
import { UsersService } from '../users/users.service';
import { GamesService } from '../games/games.service';

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private participantRepository: Repository<TournamentParticipant>,
    @InjectRepository(TournamentMatch)
    private matchRepository: Repository<TournamentMatch>,
    private notificationsService: NotificationsService,
    private botzeiService: BotzeiService,
    private usersService: UsersService,
    private gamesService: GamesService,
  ) {}

  async create(createdById: string, dto: CreateTournamentDto): Promise<Tournament> {
    // Check slug uniqueness
    const existingSlug = await this.tournamentRepository.findOne({ where: { slug: dto.slug } });
    if (existingSlug) {
      throw new ConflictException('A tournament with this slug already exists');
    }

    // If marking as featured, unfeature all others first
    if (dto.isFeatured) {
      await this.tournamentRepository.update({}, { isFeatured: false });
    }

    const tournament = this.tournamentRepository.create({
      ...dto,
      createdById,
      registrationDeadline: dto.registrationDeadline ? new Date(dto.registrationDeadline) : null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
    });

    return this.tournamentRepository.save(tournament);
  }

  async findAll(): Promise<Tournament[]> {
    return this.tournamentRepository.find({
      relations: ['game', 'platform', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(idOrSlug: string): Promise<Tournament> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const tournament = await this.tournamentRepository.findOne({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      relations: ['game', 'platform', 'createdBy'],
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }

  async setFeatured(tournamentId: string): Promise<Tournament> {
    const tournament = await this.findOne(tournamentId);
    await this.tournamentRepository.update({}, { isFeatured: false });
    await this.tournamentRepository.update(tournament.id, { isFeatured: true });
    return this.findOne(tournament.id);
  }

  async getParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
    return this.participantRepository.find({
      where: { tournamentId, withdrawnAt: IsNull() },
      relations: ['user'],
      order: { seed: 'ASC', createdAt: 'ASC' },
    });
  }

  async getParticipantCount(tournamentId: string): Promise<number> {
    return this.participantRepository.count({ where: { tournamentId, withdrawnAt: IsNull() } });
  }

  async isUserSignedUp(tournamentId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { tournamentId, userId, withdrawnAt: IsNull() },
    });
    return !!participant;
  }

  async signup(tournamentId: string, userId: string): Promise<TournamentParticipant> {
    const tournament = await this.findOne(tournamentId);

    if (tournament.status !== 'REGISTRATION') {
      throw new BadRequestException('Tournament is not open for registration');
    }

    const count = await this.getParticipantCount(tournamentId);
    if (count >= tournament.maxParticipants) {
      throw new BadRequestException('Tournament is full');
    }

    const existing = await this.participantRepository.findOne({
      where: { tournamentId, userId },
    });
    if (existing && !existing.withdrawnAt) {
      throw new ConflictException('Already signed up for this tournament');
    }

    // Check withdrawal cooldown (1 hour, skipped in dev)
    if (existing?.withdrawnAt) {
      if (process.env.NODE_ENV !== 'development') {
        const cooldownMs = 60 * 60 * 1000; // 1 hour
        const timeSinceWithdrawal = Date.now() - new Date(existing.withdrawnAt).getTime();
        if (timeSinceWithdrawal < cooldownMs) {
          const minutesLeft = Math.ceil((cooldownMs - timeSinceWithdrawal) / (60 * 1000));
          throw new BadRequestException(`You must wait ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'} before rejoining this tournament`);
        }
      }
      // Cooldown passed (or skipped in dev) - remove the old withdrawn record
      await this.participantRepository.remove(existing);
    }

    const participant = this.participantRepository.create({
      tournamentId,
      userId,
    });

    const saved = await this.participantRepository.save(participant);

    await this.notificationsService.create(
      userId,
      'CHALLENGE_ACCEPTED',
      'Tournament Signup',
      `You have signed up for ${tournament.name}`,
      tournamentId,
      'tournament',
    );

    // Send Discord DM via Botzei
    const user = await this.usersService.findById(userId);
    this.logger.log(`Tournament signup: userId=${userId}, discordId=${user?.discordId || 'NOT_LINKED'}`);

    if (user?.discordId) {
      const newCount = count + 1;
      const spotsLeft = tournament.maxParticipants - newCount;

      this.logger.log(`Sending tournament signup DM to Discord user ${user.discordId}`);
      this.botzeiService.sendTournamentSignupDm({
        discordId: user.discordId,
        username: user.username || 'Player',
        tournamentName: tournament.name,
        tournamentId: tournament.id,
        spotsLeft,
        maxParticipants: tournament.maxParticipants,
        startDate: tournament.startDate?.toISOString() || null,
        roundDeadlines: tournament.roundDeadlines || null,
      }).then(success => {
        if (success) {
          this.logger.log(`Successfully sent DM to ${user.discordId}`);
        } else {
          this.logger.warn(`Failed to send DM to ${user.discordId}`);
        }
      }).catch((err) => {
        this.logger.error(`Error sending DM: ${err.message}`);
      });
    } else {
      this.logger.warn(`User ${userId} has no Discord ID linked - skipping DM`);
    }

    return saved;
  }

  async withdraw(tournamentId: string, userId: string): Promise<void> {
    const tournament = await this.findOne(tournamentId);

    if (tournament.status !== 'REGISTRATION') {
      throw new BadRequestException('Cannot withdraw after tournament has started');
    }

    const participant = await this.participantRepository.findOne({
      where: { tournamentId, userId, withdrawnAt: IsNull() },
    });

    if (!participant) {
      throw new NotFoundException('Not signed up for this tournament');
    }

    participant.withdrawnAt = new Date();
    await this.participantRepository.save(participant);
  }

  async updateSeeds(tournamentId: string, participantIds: string[]): Promise<void> {
    const tournament = await this.findOne(tournamentId);

    if (tournament.status !== 'REGISTRATION') {
      throw new BadRequestException('Can only set seeds during registration');
    }

    const participants = await this.getParticipants(tournamentId);

    if (participantIds.length !== participants.length) {
      throw new BadRequestException('Must include all active participants');
    }

    const participantMap = new Map(participants.map((p) => [p.userId, p]));
    for (const userId of participantIds) {
      if (!participantMap.has(userId)) {
        throw new BadRequestException(`User ${userId} is not a participant`);
      }
    }

    for (let i = 0; i < participantIds.length; i++) {
      const participant = participantMap.get(participantIds[i])!;
      participant.seed = i + 1;
    }

    await this.participantRepository.save(participants);
  }

  async closeRegistration(tournamentId: string, byeUserIds?: string[]): Promise<Tournament> {
    const tournament = await this.findOne(tournamentId);

    if (tournament.status !== 'REGISTRATION') {
      throw new BadRequestException('Tournament is not in registration phase');
    }

    const participants = await this.getParticipants(tournamentId);
    const count = participants.length;

    if (count < 2) {
      throw new BadRequestException('Need at least 2 participants to close registration');
    }

    // Validate all participants have seeds set by admin
    const unseeded = participants.filter((p) => p.seed == null);
    if (unseeded.length > 0) {
      throw new BadRequestException('All participants must be seeded before closing registration');
    }

    // Sort by admin-assigned seed order
    participants.sort((a, b) => a.seed - b.seed);

    // Round up to nearest power of 2 for byes
    const bracketSize = this.nextPowerOfTwo(count);
    const numByes = bracketSize - count;

    // If specific bye players requested, reorder so they're at the top (top seeds get byes)
    if (byeUserIds && byeUserIds.length > 0) {
      if (numByes === 0) {
        throw new BadRequestException('No byes available — participant count is already a power of 2');
      }

      if (byeUserIds.length > numByes) {
        throw new BadRequestException(
          `Too many bye players specified (${byeUserIds.length}). Only ${numByes} byes available for ${count} participants`,
        );
      }

      const participantUserIds = new Set(participants.map((p) => p.userId));
      for (const userId of byeUserIds) {
        if (!participantUserIds.has(userId)) {
          throw new BadRequestException(`User ${userId} is not a participant in this tournament`);
        }
      }

      const byeSet = new Set(byeUserIds);
      const byeParticipants = participants.filter((p) => byeSet.has(p.userId));
      const nonByeParticipants = participants.filter((p) => !byeSet.has(p.userId));
      participants.length = 0;
      participants.push(...byeParticipants, ...nonByeParticipants);
    }

    // Generate bracket
    await this.generateBracket(tournamentId, participants, bracketSize);

    // Update tournament status to BRACKET_READY (bracket visible, but not started)
    tournament.status = 'BRACKET_READY';
    await this.tournamentRepository.save(tournament);

    return tournament;
  }

  async startTournament(tournamentId: string): Promise<Tournament> {
    const tournament = await this.findOne(tournamentId);

    if (tournament.status !== 'BRACKET_READY') {
      throw new BadRequestException('Tournament bracket must be posted before starting');
    }

    tournament.status = 'IN_PROGRESS';
    await this.tournamentRepository.save(tournament);

    // Send notifications for all READY matches now that the tournament is live
    const readyMatches = await this.matchRepository.find({
      where: { tournamentId, status: 'READY' },
    });
    for (const match of readyMatches) {
      await this.notifyMatchReady(match);
    }

    return tournament;
  }

  async getBracket(tournamentId: string): Promise<TournamentMatch[]> {
    return this.matchRepository.find({
      where: { tournamentId },
      relations: ['player1', 'player2', 'winner'],
      order: { round: 'DESC', matchNumber: 'ASC' },
    });
  }

  async reportMatchResult(matchId: string, winnerId: string, reporterId?: string): Promise<TournamentMatch> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['tournament', 'player1', 'player2'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.tournament.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Tournament has not started yet');
    }

    // If reporterId provided, validate they are a participant in this match
    if (reporterId) {
      const isParticipant = reporterId === match.player1Id || reporterId === match.player2Id;
      if (!isParticipant) {
        throw new ForbiddenException('Only match participants can report results');
      }
    }

    if (match.status === 'COMPLETED') {
      throw new BadRequestException('Match already completed');
    }

    if (match.status !== 'READY') {
      throw new BadRequestException('Match is not ready to be played');
    }

    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      throw new BadRequestException('Winner must be one of the match participants');
    }

    // Set winner and complete match
    match.winnerId = winnerId;
    match.status = 'COMPLETED';
    await this.matchRepository.save(match);

    // Mark loser as eliminated
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
    if (loserId) {
      await this.participantRepository.update(
        { tournamentId: match.tournamentId, userId: loserId },
        { eliminated: true },
      );
    }

    // Advance winner to next match
    const isFinal = !match.nextMatchId;
    if (match.nextMatchId) {
      await this.advanceWinner(match);
    } else {
      // This was the final - tournament complete
      await this.tournamentRepository.update(match.tournamentId, {
        status: 'COMPLETED',
      });

      // Notify winner
      await this.notificationsService.create(
        winnerId,
        'CHALLENGE_ACCEPTED',
        'Tournament Champion!',
        `Congratulations! You won ${match.tournament.name}!`,
        match.tournamentId,
        'tournament',
      );
    }

    // Report match result to Discord
    const winnerUser = winnerId === match.player1Id ? match.player1 : match.player2;
    const loserUser = winnerId === match.player1Id ? match.player2 : match.player1;
    if (winnerUser && loserUser) {
      this.botzeiService.sendTournamentMatchResult({
        tournamentName: match.tournament.name,
        tournamentSlug: match.tournament.slug,
        winnerUsername: winnerUser.username,
        loserUsername: loserUser.username,
        round: match.round,
        matchNumber: match.matchNumber,
        isFinal,
      }).catch(err => this.logger.warn(`Failed to send match result to Discord: ${err}`));
    }

    return match;
  }

  private async generateBracket(
    tournamentId: string,
    participants: TournamentParticipant[],
    bracketSize: number,
  ): Promise<void> {
    const numRounds = Math.log2(bracketSize);
    const seeded = [...participants]; // Already sorted by admin-assigned seed
    const numByes = bracketSize - seeded.length;

    // Create all matches for each round
    const matchesByRound: Map<number, TournamentMatch[]> = new Map();

    for (let round = 1; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, round - 1);
      const roundMatches: TournamentMatch[] = [];

      for (let i = 0; i < matchesInRound; i++) {
        const match = this.matchRepository.create({
          tournamentId,
          round,
          matchNumber: i + 1,
          status: 'PENDING',
        });
        roundMatches.push(match);
      }
      matchesByRound.set(round, roundMatches);
    }

    // Save all matches first to get IDs
    for (let round = 1; round <= numRounds; round++) {
      const matches = matchesByRound.get(round)!;
      const saved = await this.matchRepository.save(matches);
      matchesByRound.set(round, saved);
    }

    // Link matches (each match in round N feeds into a match in round N-1)
    for (let round = numRounds; round > 1; round--) {
      const currentRoundMatches = matchesByRound.get(round)!;
      const nextRoundMatches = matchesByRound.get(round - 1)!;

      for (let i = 0; i < currentRoundMatches.length; i++) {
        const nextMatchIndex = Math.floor(i / 2);
        currentRoundMatches[i].nextMatchId = nextRoundMatches[nextMatchIndex].id;
      }
      await this.matchRepository.save(currentRoundMatches);
    }

    // Use standard seeding order for even bye distribution across the bracket
    const seedOrder = this.generateSeedOrder(bracketSize);

    // Map seed positions to players; higher seeds (indices >= seeded.length) are byes
    const slots: (string | null)[] = new Array(bracketSize).fill(null);
    for (let i = 0; i < seeded.length; i++) {
      slots[i] = seeded[i].userId;
    }

    // Assign players to first round matches using seeding order
    const firstRoundMatches = matchesByRound.get(numRounds)!;
    for (let i = 0; i < firstRoundMatches.length; i++) {
      const player1 = slots[seedOrder[i * 2]];
      const player2 = slots[seedOrder[i * 2 + 1]];

      firstRoundMatches[i].player1Id = player1;
      firstRoundMatches[i].player2Id = player2;

      if (player1 && !player2) {
        firstRoundMatches[i].winnerId = player1;
        firstRoundMatches[i].status = 'COMPLETED';
        firstRoundMatches[i].isBye = true;
      } else if (!player1 && player2) {
        firstRoundMatches[i].winnerId = player2;
        firstRoundMatches[i].status = 'COMPLETED';
        firstRoundMatches[i].isBye = true;
      } else if (player1 && player2) {
        firstRoundMatches[i].status = 'READY';
      }
    }
    await this.matchRepository.save(firstRoundMatches);

    this.logger.log(`Generated bracket: ${bracketSize} slots, ${seeded.length} players, ${numByes} byes`);

    // Process byes - advance winners to next round
    for (const match of firstRoundMatches) {
      if (match.status === 'COMPLETED' && match.winnerId && match.nextMatchId) {
        await this.advanceWinner(match);
      }
    }

    // Match-ready notifications are sent when the tournament is started (not when bracket is generated)
  }

  private async advanceWinner(match: TournamentMatch): Promise<void> {
    if (!match.nextMatchId || !match.winnerId) return;

    const nextMatch = await this.matchRepository.findOne({
      where: { id: match.nextMatchId },
    });

    if (!nextMatch) return;

    if (!nextMatch.player1Id) {
      nextMatch.player1Id = match.winnerId;
    } else if (!nextMatch.player2Id) {
      nextMatch.player2Id = match.winnerId;
    }

    // If both players now assigned, match is ready
    const becameReady = nextMatch.player1Id && nextMatch.player2Id && nextMatch.status !== 'READY';
    if (nextMatch.player1Id && nextMatch.player2Id) {
      nextMatch.status = 'READY';
    }

    await this.matchRepository.save(nextMatch);

    // Send notifications when match becomes ready
    if (becameReady) {
      await this.notifyMatchReady(nextMatch);
    }
  }

  private generateSeedOrder(bracketSize: number): number[] {
    if (bracketSize === 2) return [0, 1];
    const half = this.generateSeedOrder(bracketSize / 2);
    const result: number[] = [];
    for (const seed of half) {
      result.push(seed, bracketSize - 1 - seed);
    }
    return result;
  }

  private nextPowerOfTwo(n: number): number {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  async updateMatchScheduledTime(matchId: string, scheduledTime: string | null): Promise<TournamentMatch> {
    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    match.scheduledTime = scheduledTime ? new Date(scheduledTime) : null;
    return this.matchRepository.save(match);
  }

  async updateMatchMaps(matchId: string, mapIds: string[], gameId: string): Promise<TournamentMatch> {
    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const allMaps = await this.gamesService.findMapsByGameId(gameId);
    const mapLookup = new Map(allMaps.map(m => [m.id, m]));

    const gameMaps: { id: string; mapName: string }[] = [];
    for (const mapId of mapIds) {
      const map = mapLookup.get(mapId);
      if (!map) {
        throw new BadRequestException(`Map ${mapId} not found for this game`);
      }
      gameMaps.push({ id: map.id, mapName: map.mapName });
    }

    match.gameMaps = gameMaps;
    return this.matchRepository.save(match);
  }

  private async notifyMatchReady(match: TournamentMatch): Promise<void> {
    const tournament = await this.findOne(match.tournamentId);
    const fullMatch = await this.matchRepository.findOne({
      where: { id: match.id },
      relations: ['player1', 'player2'],
    });

    if (!fullMatch) return;

    const playerIds = [fullMatch.player1Id, fullMatch.player2Id].filter(Boolean) as string[];
    const mapsText = fullMatch.gameMaps?.length
      ? fullMatch.gameMaps.map(m => m.mapName).join(', ')
      : 'TBD';

    for (const playerId of playerIds) {
      await this.notificationsService.create(
        playerId,
        'CHALLENGE_ACCEPTED',
        'Match Ready!',
        `Your match in ${tournament.name} is ready! Maps: ${mapsText}`,
        match.id,
        'tournament_match',
      );
    }
  }

  async getMyCurrentMatch(tournamentId: string, userId: string): Promise<TournamentMatch | null> {
    // First verify user is a participant
    const participant = await this.participantRepository.findOne({
      where: { tournamentId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this tournament');
    }

    // If user is eliminated, return null
    if (participant.eliminated) {
      return null;
    }

    // Find user's active match (READY or IN_PROGRESS status where user is player1 or player2)
    const match = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.player1', 'player1')
      .leftJoinAndSelect('match.player2', 'player2')
      .leftJoinAndSelect('match.winner', 'winner')
      .where('match.tournamentId = :tournamentId', { tournamentId })
      .andWhere('(match.player1Id = :userId OR match.player2Id = :userId)', { userId })
      .andWhere('match.status IN (:...statuses)', { statuses: ['READY', 'IN_PROGRESS'] })
      .getOne();

    return match;
  }

  async getActiveMatchesForUser(userId: string): Promise<{ match: TournamentMatch; tournament: Tournament }[]> {
    // Find all active matches across all tournaments where user is a participant
    const matches = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.tournament', 'tournament')
      .leftJoinAndSelect('tournament.game', 'game')
      .leftJoinAndSelect('tournament.platform', 'platform')
      .leftJoinAndSelect('match.player1', 'player1')
      .leftJoinAndSelect('match.player2', 'player2')
      .where('tournament.status IN (:...statuses)', { statuses: ['BRACKET_READY', 'IN_PROGRESS'] })
      .andWhere('(match.player1Id = :userId OR match.player2Id = :userId)', { userId })
      .andWhere('match.status IN (:...statuses)', { statuses: ['READY', 'IN_PROGRESS'] })
      .getMany();

    return matches.map(match => ({
      match,
      tournament: match.tournament,
    }));
  }
}
