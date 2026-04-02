import { Controller, Get, Post, Patch, Param, Body, Query, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtAuthOptionalGuard } from '../auth/guards/jwt-auth-optional.guard';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { BotCreateMatchDto } from './dto/bot-create-match.dto';
import { MatchStatus } from './match.entity';
import { UsersService } from '../users/users.service';
import { LeaderboardsService } from '../leaderboards/leaderboards.service';

@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly usersService: UsersService,
    private readonly leaderboardsService: LeaderboardsService,
  ) {}

  @Get('disputes/moderation-queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ref')
  async getModerationQueue(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    const level = user?.role === 'admin' ? 'admin' : 'ref';
    return this.matchesService.getModerationQueue(level);
  }

  // Public endpoint - no auth required
  @Get('share/:token')
  async findByShareToken(@Param('token') token: string) {
    return this.matchesService.findByShareToken(token);
  }

  // Public search endpoint for AI queries
  @Get('search')
  async search(
    @Query('userId') userId?: string,
    @Query('opponentId') opponentId?: string,
    @Query('status') status?: MatchStatus,
    @Query('game') game?: string,
    @Query('platform') platform?: string,
    @Query('type') type?: 'XP' | 'RANKED',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.matchesService.search({
      userId,
      opponentId,
      status,
      game,
      platform,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req, @Body() createMatchDto: CreateMatchDto) {
    return this.matchesService.create(req.user.userId, createMatchDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Request() req,
    @Query('status') status?: MatchStatus,
    @Query('role') role?: 'challenger' | 'challengee',
  ) {
    return this.matchesService.findAllForUser(req.user.userId, status, role);
  }

  /** Pending XP open listings (no opponent yet) for matchfinder browse. */
  @Get('xp-open')
  @UseGuards(JwtAuthGuard)
  async findXpOpen(
    @Query('leaderboardId') leaderboardId?: string,
    @Query('game') game?: string,
    @Query('platform') platform?: string,
    @Query('limit') limit?: string,
  ) {
    let lbId = leaderboardId;
    if (!lbId) {
      if (!game?.trim() || !platform?.trim()) {
        throw new BadRequestException('Provide leaderboardId or both game and platform query parameters');
      }
      const lb = await this.leaderboardsService.findByGameAndPlatform(game, platform);
      lbId = lb.id;
    }
    return this.matchesService.findXpOpenForLeaderboard(lbId, limit ? parseInt(limit, 10) : 50);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.matchesService.findOne(id);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard)
  async accept(@Param('id') id: string, @Request() req) {
    return this.matchesService.accept(id, req.user.userId);
  }

  @Patch(':id/decline')
  @UseGuards(JwtAuthGuard)
  async decline(@Param('id') id: string, @Request() req) {
    return this.matchesService.decline(id, req.user.userId);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Request() req) {
    return this.matchesService.cancel(id, req.user.userId);
  }

  @Patch(':id/report-result')
  @UseGuards(JwtAuthGuard)
  async reportResult(
    @Param('id') id: string,
    @Request() req,
    @Body() body: {
      reportedWinnerId: string;
      mapResults?: { mapName: string; winner: 'challenger' | 'challengee' }[];
    },
  ) {
    return this.matchesService.reportResult(
      id,
      req.user.userId,
      body.reportedWinnerId,
      body.mapResults || [],
    );
  }

  @Patch(':id/concede')
  @UseGuards(JwtAuthGuard)
  async concedeDispute(@Param('id') id: string, @Request() req) {
    return this.matchesService.concedeDispute(id, req.user.userId);
  }

  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ref')
  async moderateMatch(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { winnerId: string },
  ) {
    return this.matchesService.moderateMatch(req.user.userId, id, body.winnerId);
  }

  @Post(':id/dispute-ref-decision')
  @UseGuards(JwtAuthGuard)
  async disputeRefDecision(@Param('id') id: string, @Request() req) {
    return this.matchesService.disputeRefDecision(req.user.userId, id);
  }

  // Bot-authenticated endpoints (API key instead of JWT)

  @Post('bot/create')
  @UseGuards(ApiKeyGuard)
  async botCreateMatch(@Body() dto: BotCreateMatchDto) {
    const challenger = await this.usersService.findByDiscordId(dto.challengerDiscordId);
    if (!challenger) {
      throw new BadRequestException('Challenger does not have an account');
    }

    const challengee = await this.usersService.findByDiscordId(dto.challengeeDiscordId);
    if (!challengee) {
      throw new BadRequestException('Challengee does not have an account');
    }

    const leaderboard = await this.leaderboardsService.findByGameAndPlatform(dto.game, dto.platform);

    const createMatchDto: CreateMatchDto = {
      challengeeId: challengee.id,
      leaderboardId: leaderboard.id,
      type: dto.type,
      bestOf: dto.bestOf,
      selectedMaps: dto.selectedMaps,
      message: dto.message,
    };

    return this.matchesService.create(challenger.id, createMatchDto);
  }

  @Patch('bot/:id/accept')
  @UseGuards(ApiKeyGuard)
  async botAcceptMatch(@Param('id') id: string, @Body('discordId') discordId: string) {
    const user = await this.usersService.findByDiscordId(discordId);
    if (!user) {
      throw new BadRequestException('User does not have an account');
    }
    return this.matchesService.accept(id, user.id);
  }

  @Patch('bot/:id/decline')
  @UseGuards(ApiKeyGuard)
  async botDeclineMatch(@Param('id') id: string, @Body('discordId') discordId: string) {
    const user = await this.usersService.findByDiscordId(discordId);
    if (!user) {
      throw new BadRequestException('User does not have an account');
    }
    return this.matchesService.decline(id, user.id);
  }

  @Post('bot/complete-match')
  @UseGuards(ApiKeyGuard)
  async botCompleteMatch(@Body() body: {
    challengerDiscordId: string;
    challengeeDiscordId: string;
    winnerDiscordId: string;
    leaderboardId: string;
    map: string;
  }) {
    const challenger = await this.usersService.findByDiscordId(body.challengerDiscordId);
    if (!challenger) throw new BadRequestException('Challenger does not have an account');

    const challengee = await this.usersService.findByDiscordId(body.challengeeDiscordId);
    if (!challengee) throw new BadRequestException('Challengee does not have an account');

    const winner = await this.usersService.findByDiscordId(body.winnerDiscordId);
    if (!winner) throw new BadRequestException('Winner does not have an account');

    // Create match already completed
    const match = await this.matchesService.createCompleted({
      challengerId: challenger.id,
      challengeeId: challengee.id,
      winnerId: winner.id,
      leaderboardId: body.leaderboardId,
      map: body.map,
    });

    // Award XP: winner gets 100, loser gets 25
    const loserId = winner.id === challenger.id ? challengee.id : challenger.id;
    await this.leaderboardsService.awardXp(winner.id, body.leaderboardId, 100);
    await this.leaderboardsService.awardXp(loserId, body.leaderboardId, 25);

    return match;
  }
}
