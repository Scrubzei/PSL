import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './tournament.entity';
import { TournamentParticipant } from './tournament-participant.entity';
import { TournamentMatch } from './tournament-match.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentParticipant)
    private participantRepository: Repository<TournamentParticipant>,
    @InjectRepository(TournamentMatch)
    private matchRepository: Repository<TournamentMatch>,
    private notificationsService: NotificationsService,
  ) {}

  async create(createdById: string, dto: CreateTournamentDto): Promise<Tournament> {
    // Validate maxParticipants is a power of 2
    if (!this.isPowerOfTwo(dto.maxParticipants)) {
      throw new BadRequestException('maxParticipants must be a power of 2 (4, 8, 16, 32, 64)');
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

  async findOne(id: string): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { id },
      relations: ['game', 'platform', 'createdBy'],
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }

  async getParticipants(tournamentId: string): Promise<TournamentParticipant[]> {
    return this.participantRepository.find({
      where: { tournamentId },
      relations: ['user'],
      order: { seed: 'ASC', createdAt: 'ASC' },
    });
  }

  async getParticipantCount(tournamentId: string): Promise<number> {
    return this.participantRepository.count({ where: { tournamentId } });
  }

  async isUserSignedUp(tournamentId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { tournamentId, userId },
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
    if (existing) {
      throw new ConflictException('Already signed up for this tournament');
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

    return saved;
  }

  async withdraw(tournamentId: string, userId: string): Promise<void> {
    const tournament = await this.findOne(tournamentId);

    if (tournament.status !== 'REGISTRATION') {
      throw new BadRequestException('Cannot withdraw after tournament has started');
    }

    const participant = await this.participantRepository.findOne({
      where: { tournamentId, userId },
    });

    if (!participant) {
      throw new NotFoundException('Not signed up for this tournament');
    }

    await this.participantRepository.remove(participant);
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
      relations: ['player1', 'player2', 'winner'],
      order: { round: 'DESC', matchNumber: 'ASC' },
    });
  }

  async reportMatchResult(matchId: string, winnerId: string): Promise<TournamentMatch> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
      relations: ['tournament', 'player1', 'player2'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
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
    if (nextMatch.player1Id && nextMatch.player2Id) {
      nextMatch.status = 'READY';
    }

    await this.matchRepository.save(nextMatch);
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
}
