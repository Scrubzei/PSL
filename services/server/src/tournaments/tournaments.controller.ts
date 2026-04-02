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
    const tournamentId = tournament.id;
    const participantCount = await this.tournamentsService.getParticipantCount(tournamentId);
    const isSignedUp = req.user
      ? await this.tournamentsService.isUserSignedUp(tournamentId, req.user.userId)
      : false;
    const participants = await this.tournamentsService.getParticipants(tournamentId);

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
          discordId: p.user.discordId,
        },
      })),
    };
  }

  @Post(':id/signup')
  @UseGuards(JwtAuthGuard)
  async signup(@Param('id') id: string, @Request() req) {
    const tournament = await this.tournamentsService.findOne(id);
    return this.tournamentsService.signup(tournament.id, req.user.userId);
  }

  @Delete(':id/signup')
  @UseGuards(JwtAuthGuard)
  async withdraw(@Param('id') id: string, @Request() req) {
    const tournament = await this.tournamentsService.findOne(id);
    await this.tournamentsService.withdraw(tournament.id, req.user.userId);
    return { message: 'Successfully withdrawn from tournament' };
  }

  @Get(':id/bracket')
  async getBracket(@Param('id') id: string) {
    const tournament = await this.tournamentsService.findOne(id);
    const tournamentId = tournament.id;

    const matches = await this.tournamentsService.getBracket(tournamentId);
    return {
      tournament,
      matches: matches.map((m) => ({
        id: m.id,
        round: m.round,
        matchNumber: m.matchNumber,
        status: m.status,
        nextMatchId: m.nextMatchId,
        isBye: m.isBye,
        player1: m.player1 ? { id: m.player1.id, username: m.player1.username, xboxGamertag: m.player1.xboxGamertag || null, plutoniumUsername: m.player1.plutoniumUsername || null, discordUsername: m.player1.discordUsername || null } : null,
        player2: m.player2 ? { id: m.player2.id, username: m.player2.username, xboxGamertag: m.player2.xboxGamertag || null, plutoniumUsername: m.player2.plutoniumUsername || null, discordUsername: m.player2.discordUsername || null } : null,
        winner: m.winner ? { id: m.winner.id, username: m.winner.username } : null,
        gameMaps: m.gameMaps || [],
        scheduledTime: m.scheduledTime || null,
      })),
    };
  }

  @Patch(':id/swap-player')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async swapPlayer(
    @Param('id') id: string,
    @Body() body: { oldUserId: string; newUserId: string },
  ) {
    const tournament = await this.tournamentsService.findOne(id);
    await this.tournamentsService.swapPlayer(tournament.id, body.oldUserId, body.newUserId);
    return { message: 'Player swapped successfully' };
  }

  @Patch('matches/:matchId/maps')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ref')
  async updateMatchMaps(
    @Param('matchId') matchId: string,
    @Body() body: { mapIds: string[]; gameId: string },
  ) {
    return this.tournamentsService.updateMatchMaps(matchId, body.mapIds, body.gameId);
  }

  @Patch('matches/:matchId/scheduled-time')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateMatchScheduledTime(
    @Param('matchId') matchId: string,
    @Body() body: { scheduledTime: string | null },
  ) {
    return this.tournamentsService.updateMatchScheduledTime(matchId, body.scheduledTime);
  }

  @Patch(':id/feature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async setFeatured(@Param('id') id: string) {
    return this.tournamentsService.setFeatured(id);
  }

  @Patch(':id/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateSeeds(
    @Param('id') id: string,
    @Body() body: { participantIds: string[] },
  ) {
    const tournament = await this.tournamentsService.findOne(id);
    await this.tournamentsService.updateSeeds(tournament.id, body.participantIds);
    return { message: 'Seeds updated' };
  }

  @Post(':id/close-registration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async closeRegistration(
    @Param('id') id: string,
    @Body() body?: { byeUserIds?: string[] },
  ) {
    const tournament = await this.tournamentsService.findOne(id);
    return this.tournamentsService.closeRegistration(tournament.id, body?.byeUserIds);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async startTournament(@Param('id') id: string) {
    const tournament = await this.tournamentsService.findOne(id);
    return this.tournamentsService.startTournament(tournament.id);
  }

  @Patch('matches/:matchId/result')
  @UseGuards(JwtAuthGuard)
  async reportResult(
    @Param('matchId') matchId: string,
    @Body() body: { winnerId: string },
    @Request() req,
  ) {
    const userRole = req.user.role;
    const userId = req.user.userId;

    // Admin/ref can report any match (pass null to skip participant check)
    // Regular users must be participants in the match
    const reporterId = (userRole === 'admin' || userRole === 'ref') ? null : userId;

    return this.tournamentsService.reportMatchResult(matchId, body.winnerId, reporterId);
  }

  @Get(':id/my-match')
  @UseGuards(JwtAuthGuard)
  async getMyMatch(@Param('id') id: string, @Request() req) {
    const tournament = await this.tournamentsService.findOne(id);
    const match = await this.tournamentsService.getMyCurrentMatch(tournament.id, req.user.userId);

    if (!match) {
      return { match: null };
    }

    return {
      match: {
        id: match.id,
        round: match.round,
        matchNumber: match.matchNumber,
        status: match.status,
        player1: match.player1 ? { id: match.player1.id, username: match.player1.username } : null,
        player2: match.player2 ? { id: match.player2.id, username: match.player2.username } : null,
        winner: match.winner ? { id: match.winner.id, username: match.winner.username } : null,
        gameMaps: match.gameMaps || [],
        scheduledTime: match.scheduledTime || null,
      },
    };
  }

  @Get('user/active-matches')
  @UseGuards(JwtAuthGuard)
  async getActiveMatches(@Request() req) {
    const results = await this.tournamentsService.getActiveMatchesForUser(req.user.userId);

    return results.map(({ match, tournament }) => ({
      match: {
        id: match.id,
        round: match.round,
        matchNumber: match.matchNumber,
        status: match.status,
        player1: match.player1 ? { id: match.player1.id, username: match.player1.username } : null,
        player2: match.player2 ? { id: match.player2.id, username: match.player2.username } : null,
        gameMaps: match.gameMaps || [],
        scheduledTime: match.scheduledTime || null,
      },
      tournament: {
        id: tournament.id,
        slug: tournament.slug,
        name: tournament.name,
        game: tournament.game ? { id: tournament.game.id, name: tournament.game.name } : null,
        platform: tournament.platform ? { id: tournament.platform.id, name: tournament.platform.name } : null,
      },
    }));
  }
}
