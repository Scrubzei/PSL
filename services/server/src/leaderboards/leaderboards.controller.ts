import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  @Get()
  async findAll() {
    return this.leaderboardsService.findAll();
  }

  @Get('by-game-platform')
  async findByGameAndPlatform(
    @Query('game') game: string,
    @Query('platform') platform: string,
  ) {
    return this.leaderboardsService.findByGameAndPlatform(game, platform);
  }

  @Get(':id/entries')
  async getEntries(
    @Param('id') id: string,
    @Query('type') type: 'ranked' | 'xp' = 'ranked',
  ) {
    return this.leaderboardsService.getEntries(id, type);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/signup')
  async signup(@Param('id') id: string, @Request() req) {
    return this.leaderboardsService.signup(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/xp-join')
  async xpJoin(@Param('id') id: string, @Request() req) {
    return this.leaderboardsService.xpJoin(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/my-entry')
  async getMyEntry(@Param('id') id: string, @Request() req) {
    const entry = await this.leaderboardsService.getUserEntry(req.user.userId, id);
    return { isSignedUp: !!entry, entry };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/add-player')
  async addPlayer(
    @Param('id') id: string,
    @Body() body: { username: string },
  ) {
    return this.leaderboardsService.addUserByUsername(id, body.username);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/ranks')
  async updateRanks(
    @Param('id') id: string,
    @Body() body: { ranks: { userId: string; rank: number }[] },
  ) {
    await this.leaderboardsService.updateRanks(id, body.ranks);
    return { success: true };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.leaderboardsService.findById(id);
  }
}
