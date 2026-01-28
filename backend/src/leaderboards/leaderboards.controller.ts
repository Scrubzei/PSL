import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.leaderboardsService.findById(id);
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
  @Get(':id/my-entry')
  async getMyEntry(@Param('id') id: string, @Request() req) {
    const entry = await this.leaderboardsService.getUserEntry(req.user.userId, id);
    return { isSignedUp: !!entry, entry };
  }
}
