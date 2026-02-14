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
      const users = await this.usersService.searchByUsername(username);
      return users.map(({ password, ...user }) => user);
    }
    const users = await this.usersService.findAll();
    return users.map(({ password, ...user }) => user);
  }

  @Get('by-username/:username')
  async findByUsername(@Param('username') username: string) {
    const user = await this.usersService.findByUsernameExact(username);
    if (!user) {
      return null;
    }
    const { password, ...result } = user;
    return result;
  }

  @Get('by-discord/:discordId')
  async findByDiscordId(@Param('discordId') discordId: string) {
    const user = await this.usersService.findByDiscordId(discordId);
    if (!user) {
      return null;
    }
    const { password, ...result } = user;
    return result;
  }

  @Get('by-discord/:discordId/stats')
  async getStatsByDiscordId(@Param('discordId') discordId: string) {
    const user = await this.usersService.findByDiscordId(discordId);
    if (!user) {
      return null;
    }
    const dashboardStats = await this.usersService.getUserDashboardStats(user.id);
    const { password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      stats: dashboardStats,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return null;
    }
    const { password, ...result } = user;
    return result;
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
