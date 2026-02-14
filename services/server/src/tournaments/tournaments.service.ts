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
    // Validate maxParticipants is a power of 2
    if (!this.isPowerOfTwo(dto.maxParticipants)) {
      throw new BadRequestException('maxParticipants must be a power of 2 (4, 8, 16, 32, 64)');
    }

    // Check slug uniqueness
    const existingSlug = await this.tournamentRepository.findOne({ where: { slug: dto.slug } });
    if (existingSlug) {
      throw new ConflictException('A tournament with this slug already exists');
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

    // Check withdrawal cooldown (1 hour)
    if (existing?.withdrawnAt) {
      const cooldownMs = 60 * 60 * 1000; // 1 hour
      const timeSinceWithdrawal = Date.now() - new Date(existing.withdrawnAt).getTime();
      if (timeSinceWithdrawal < cooldownMs) {
        const minutesLeft = Math.ceil((cooldownMs - timeSinceWithdrawal) / (60 * 1000));
        throw new BadRequestException(`You must wait ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'} before rejoining this tournament`);
      }
      // Cooldown passed - remove the old withdrawn record
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

  async startTournament(tournamentId: string): Promise<Tournament> {
    const tournament = await this.findOne(tournamentId);

    if (tournament.status !== 'REGISTRATION') {
      throw new BadRequestException('Tournament is not in registration phase');
    }

    const participants = await this.getParticipants(tournamentId);
    const count = participants.length;

    if (count < 2) {
      throw new BadRequestException('Need at least 2 participants to start');
    }

    if (count < tournament.maxParticipants) {
      throw new BadRequestException(`Tournament is not full. Need ${tournament.maxParticipants} participants, currently have ${count}`);
    }

    // Round up to nearest power of 2 for byes
    const bracketSize = this.nextPowerOfTwo(count);

    // Generate bracket
    await this.generateBracket(tournamentId, participants, bracketSize);

    // Update tournament status
    tournament.status = 'IN_PROGRESS';
    await this.tournamentRepository.save(tournament);

    // Notify all participants
    for (const p of participants) {
      await this.notificationsService.create(
        p.userId,
        'CHALLENGE_ACCEPTED',
        'Tournament Started',
        `${tournament.name} has started! Check your bracket.`,
        tournamentId,
        'tournament',
      );
    }

    return tournament;
  }

  async getBracket(tournamentId: string): Promise<TournamentMatch[]> {
    return this.matchRepository.find({
      where: { tournamentId },
      relations: ['player1', 'player2', 'winner', 'gameMap'],
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

    return match;
  }

  private async generateBracket(
    tournamentId: string,
    participants: TournamentParticipant[],
    bracketSize: number,
  ): Promise<void> {
    const numRounds = Math.log2(bracketSize);
    const shuffled = this.shuffle([...participants]);

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

    // Assign players to first round matches
    const firstRoundMatches = matchesByRound.get(numRounds)!;
    for (let i = 0; i < firstRoundMatches.length; i++) {
      const player1Index = i * 2;
      const player2Index = i * 2 + 1;

      if (player1Index < shuffled.length) {
        firstRoundMatches[i].player1Id = shuffled[player1Index].userId;
      }
      if (player2Index < shuffled.length) {
        firstRoundMatches[i].player2Id = shuffled[player2Index].userId;
      }

      // Handle byes - if only one player, auto-advance them
      if (firstRoundMatches[i].player1Id && !firstRoundMatches[i].player2Id) {
        firstRoundMatches[i].winnerId = firstRoundMatches[i].player1Id;
        firstRoundMatches[i].status = 'COMPLETED';
      } else if (!firstRoundMatches[i].player1Id && firstRoundMatches[i].player2Id) {
        firstRoundMatches[i].winnerId = firstRoundMatches[i].player2Id;
        firstRoundMatches[i].status = 'COMPLETED';
      } else if (firstRoundMatches[i].player1Id && firstRoundMatches[i].player2Id) {
        firstRoundMatches[i].status = 'READY';
      }
    }
    await this.matchRepository.save(firstRoundMatches);

    // Process byes - advance winners to next round
    for (const match of firstRoundMatches) {
      if (match.status === 'COMPLETED' && match.winnerId && match.nextMatchId) {
        await this.advanceWinner(match);
      }
    }

    // Assign random maps to all matches
    await this.assignRandomMapsToMatches(tournamentId);

    // Send notifications for first round READY matches
    const readyMatches = firstRoundMatches.filter(m => m.status === 'READY');
    for (const match of readyMatches) {
      await this.notifyMatchReady(match);
    }
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

  private isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  private nextPowerOfTwo(n: number): number {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async assignRandomMapsToMatches(tournamentId: string): Promise<void> {
    const tournament = await this.findOne(tournamentId);
    const maps = await this.gamesService.findMapsByGameId(tournament.gameId);

    if (maps.length === 0) {
      this.logger.warn(`No maps found for game ${tournament.gameId}`);
      return;
    }

    const matches = await this.matchRepository.find({ where: { tournamentId } });

    for (const match of matches) {
      const randomIndex = Math.floor(Math.random() * maps.length);
      match.gameMapId = maps[randomIndex].id;
    }

    await this.matchRepository.save(matches);
    this.logger.log(`Assigned random maps to ${matches.length} matches in tournament ${tournamentId}`);
  }

  private async notifyMatchReady(match: TournamentMatch): Promise<void> {
    const tournament = await this.findOne(match.tournamentId);
    const fullMatch = await this.matchRepository.findOne({
      where: { id: match.id },
      relations: ['player1', 'player2', 'gameMap'],
    });

    if (!fullMatch) return;

    const playerIds = [fullMatch.player1Id, fullMatch.player2Id].filter(Boolean) as string[];
    const mapName = fullMatch.gameMap?.mapName || 'Random';

    for (const playerId of playerIds) {
      // In-app notification
      await this.notificationsService.create(
        playerId,
        'CHALLENGE_ACCEPTED',
        'Match Ready!',
        `Your match in ${tournament.name} is ready! Map: ${mapName}`,
        match.id,
        'tournament_match',
      );

      // Discord DM
      const user = await this.usersService.findById(playerId);
      if (user?.discordId) {
        const opponent = playerId === fullMatch.player1Id
          ? fullMatch.player2?.username
          : fullMatch.player1?.username;

        this.botzeiService.sendDm({
          discordId: user.discordId,
          embed: {
            title: '🎮 Match Ready!',
            description: 'Your tournament match is ready to play!',
            color: 0x22D3EE,
            fields: [
              { name: 'Tournament', value: tournament.name, inline: true },
              { name: 'Opponent', value: opponent || 'TBD', inline: true },
              { name: 'Map', value: mapName, inline: true },
              { name: 'Round', value: this.getRoundName(match.round, tournament.maxParticipants), inline: true },
            ],
            footer: { text: '1v1 Leaderboards' },
          },
        }).catch(err => this.logger.error(`Failed to send match ready DM: ${err.message}`));
      }
    }
  }

  private getRoundName(round: number, maxParticipants: number): string {
    const totalRounds = Math.log2(maxParticipants);
    if (round === 1) return 'Grand Finals';
    if (round === 2) return 'Semi-Finals';
    if (round === 3) return 'Quarter-Finals';
    return `Round ${totalRounds - round + 1}`;
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
      .leftJoinAndSelect('match.gameMap', 'gameMap')
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
      .leftJoinAndSelect('match.gameMap', 'gameMap')
      .where('tournament.status = :status', { status: 'IN_PROGRESS' })
      .andWhere('(match.player1Id = :userId OR match.player2Id = :userId)', { userId })
      .andWhere('match.status IN (:...statuses)', { statuses: ['READY', 'IN_PROGRESS'] })
      .getMany();

    return matches.map(match => ({
      match,
      tournament: match.tournament,
    }));
  }
}
