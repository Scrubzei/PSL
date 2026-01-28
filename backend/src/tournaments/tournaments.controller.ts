import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtAuthOptionalGuard } from '../auth/guards/jwt-auth-optional.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Request() req, @Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(req.user.userId, dto);
  }

  @Get()
  async findAll() {
    const tournaments = await this.tournamentsService.findAll();
    // Add participant count to each tournament
    return Promise.all(
      tournaments.map(async (t) => ({
        ...t,
        participantCount: await this.tournamentsService.getParticipantCount(t.id),
      })),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthOptionalGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    const tournament = await this.tournamentsService.findOne(id);
    const participantCount = await this.tournamentsService.getParticipantCount(id);
    const isSignedUp = req.user
      ? await this.tournamentsService.isUserSignedUp(id, req.user.userId)
      : false;
    const participants = await this.tournamentsService.getParticipants(id);

    return {
      ...tournament,
      participantCount,
      isSignedUp,
      participants: participants.map((p) => ({
        id: p.id,
        seed: p.seed,
        eliminated: p.eliminated,
        user: {
          id: p.user.id,
          username: p.user.username,
        },
      })),
    };
  }

  @Post(':id/signup')
  @UseGuards(JwtAuthGuard)
  async signup(@Param('id') id: string, @Request() req) {
    return this.tournamentsService.signup(id, req.user.userId);
  }

  @Delete(':id/signup')
  @UseGuards(JwtAuthGuard)
  async withdraw(@Param('id') id: string, @Request() req) {
    await this.tournamentsService.withdraw(id, req.user.userId);
    return { message: 'Successfully withdrawn from tournament' };
  }

  @Get(':id/bracket')
  @UseGuards(JwtAuthOptionalGuard)
  async getBracket(@Param('id') id: string, @Request() req) {
    const tournament = await this.tournamentsService.findOne(id);

    // Only allow bracket viewing if signed up or tournament has started
    const isSignedUp = req.user
      ? await this.tournamentsService.isUserSignedUp(id, req.user.userId)
      : false;
    const isAdmin = req.user?.role === 'admin';

    if (tournament.status === 'REGISTRATION' && !isSignedUp && !isAdmin) {
      throw new ForbiddenException('Sign up to view the bracket');
    }

    const matches = await this.tournamentsService.getBracket(id);
    return {
      tournament,
      matches: matches.map((m) => ({
        id: m.id,
        round: m.round,
        matchNumber: m.matchNumber,
        status: m.status,
        nextMatchId: m.nextMatchId,
        player1: m.player1 ? { id: m.player1.id, username: m.player1.username } : null,
        player2: m.player2 ? { id: m.player2.id, username: m.player2.username } : null,
        winner: m.winner ? { id: m.winner.id, username: m.winner.username } : null,
      })),
    };
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async startTournament(@Param('id') id: string) {
    return this.tournamentsService.startTournament(id);
  }

  @Patch('matches/:matchId/result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ref')
  async reportResult(
    @Param('matchId') matchId: string,
    @Body() body: { winnerId: string },
  ) {
    return this.tournamentsService.reportMatchResult(matchId, body.winnerId);
  }
}
