import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('recent-wins')
  async getRecentWins(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.usersService.getGlobalRecentWins(Math.min(parsedLimit, 50));
  }

  @Get()
  async findAll(@Query('username') username?: string) {
    if (username) {
      return this.usersService.searchByUsername(username);
    }
    return this.usersService.findAll();
  }

  @Get('by-username/:username')
  async findByUsername(@Param('username') username: string) {
    return this.usersService.findByUsernameExact(username) ?? null;
  }

  @Get('by-discord/:discordId')
  async findByDiscordId(@Param('discordId') discordId: string) {
    return this.usersService.findByDiscordId(discordId) ?? null;
  }

  @Get('by-discord/:discordId/stats')
  async getStatsByDiscordId(@Param('discordId') discordId: string) {
    const user = await this.usersService.findByDiscordId(discordId);
    if (!user) {
      return null;
    }
    const dashboardStats = await this.usersService.getUserDashboardStats(user.id);
    return {
      user,
      stats: dashboardStats,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id) ?? null;
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.usersService.getUserProfileStats(id);
  }

  @Get(':id/dashboard-stats')
  async getDashboardStats(@Param('id') id: string) {
    return this.usersService.getUserDashboardStats(id);
  }

  @Get(':id/head-to-head/:opponentId')
  async getHeadToHead(
    @Param('id') id: string,
    @Param('opponentId') opponentId: string,
  ) {
    return this.usersService.getHeadToHeadStats(id, opponentId);
  }
}
