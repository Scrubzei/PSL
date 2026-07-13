import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async findAll(@Query('game') game?: string) {
    return this.teamsService.findAll(game);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async myTeams(@Request() req: any) {
    return this.teamsService.findUserTeams(req.user.id);
  }

  @Get('my/invites')
  @UseGuards(JwtAuthGuard)
  async myInvites(@Request() req: any) {
    return this.teamsService.findUserInvites(req.user.id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.teamsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() body: {
    name: string;
    tag: string;
    game: string;
    region?: string;
    logo?: string;
    color?: string;
    bio?: string;
  }) {
    return this.teamsService.create(req.user.id, body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    return this.teamsService.update(id, req.user.id, body);
  }

  @Post(':id/invite')
  @UseGuards(JwtAuthGuard)
  async invite(@Param('id') id: string, @Request() req: any, @Body() body: { userId: string }) {
    return this.teamsService.invite(id, req.user.id, body.userId);
  }

  @Post('invites/:inviteId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvite(@Param('inviteId') inviteId: string, @Request() req: any) {
    return this.teamsService.acceptInvite(inviteId, req.user.id);
  }

  @Post('invites/:inviteId/decline')
  @UseGuards(JwtAuthGuard)
  async declineInvite(@Param('inviteId') inviteId: string, @Request() req: any) {
    await this.teamsService.declineInvite(inviteId, req.user.id);
    return { success: true };
  }

  @Delete('invites/:inviteId')
  @UseGuards(JwtAuthGuard)
  async cancelInvite(@Param('inviteId') inviteId: string, @Request() req: any) {
    await this.teamsService.cancelInvite(inviteId, req.user.id);
    return { success: true };
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  async kick(@Param('id') id: string, @Param('userId') userId: string, @Request() req: any) {
    await this.teamsService.kick(id, req.user.id, userId);
    return { success: true };
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  async leave(@Param('id') id: string, @Request() req: any) {
    await this.teamsService.leave(id, req.user.id);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async disband(@Param('id') id: string, @Request() req: any) {
    await this.teamsService.disband(id, req.user.id);
    return { success: true };
  }
}
