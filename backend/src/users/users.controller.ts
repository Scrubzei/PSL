import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get(':id/head-to-head/:opponentId')
  async getHeadToHead(
    @Param('id') id: string,
    @Param('opponentId') opponentId: string,
  ) {
    return this.usersService.getHeadToHeadStats(id, opponentId);
  }
}
