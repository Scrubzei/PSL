import { Controller, Get, Post, Patch, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtAuthOptionalGuard } from '../auth/guards/jwt-auth-optional.guard';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { MatchStatus } from './match.entity';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

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
}
