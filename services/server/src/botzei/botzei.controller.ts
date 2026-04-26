import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { BotzeiService } from './botzei.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('botzei')
export class BotzeiController {
  constructor(private readonly botzeiService: BotzeiService) {}

  @Get('guilds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async getGuilds() {
    const data = await this.botzeiService.getGuilds();
    if (!data) return { guilds: [], botUser: null, uptime: null };
    return data;
  }

  @Get('guilds/:guildId/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async getGuildSettings(@Param('guildId') guildId: string) {
    return this.botzeiService.getGuildSettings(guildId);
  }

  @Patch('guilds/:guildId/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async setGuildSettings(
    @Param('guildId') guildId: string,
    @Body() body: any,
  ) {
    return this.botzeiService.setGuildSettings(guildId, body);
  }

  @Get('guilds/:guildId/channels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async getGuildChannels(@Param('guildId') guildId: string) {
    return this.botzeiService.getGuildChannels(guildId);
  }

  @Get('queues')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async getQueues() {
    return this.botzeiService.getQueues();
  }

  @Post('queues')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async createQueue(@Body() body: any) {
    const result = await this.botzeiService.createQueueViaBot(body);
    if (result?.error) {
      return { error: result.error };
    }
    return result;
  }

  @Patch('queues/:queueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async updateQueueViaWeb(
    @Param('queueId') queueId: string,
    @Body() body: any,
  ) {
    return this.botzeiService.updateQueueViaBot(queueId, body);
  }

  @Delete('queues/:queueId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async deleteQueue(@Param('queueId') queueId: string) {
    const success = await this.botzeiService.deleteQueueViaBot(queueId);
    return { success };
  }

  @Get('guild-settings-all')
  @UseGuards(ApiKeyGuard)
  async getAllGuildSettings() {
    return this.botzeiService.getAllGuildSettings();
  }

  @Get('guild-settings/:guildId')
  @UseGuards(ApiKeyGuard)
  async getGuildSettingsByApi(@Param('guildId') guildId: string) {
    return this.botzeiService.getGuildSettings(guildId);
  }

  @Patch('guild-settings/:guildId')
  @UseGuards(ApiKeyGuard)
  async setGuildSettingsByApi(
    @Param('guildId') guildId: string,
    @Body() body: any,
  ) {
    return this.botzeiService.setGuildSettings(guildId, body);
  }

  @Get('server-info-targets')
  @UseGuards(ApiKeyGuard)
  async getServerInfoTargets() {
    return this.botzeiService.getServerInfoTargets();
  }

  @Post('server-info-targets')
  @UseGuards(ApiKeyGuard)
  async addServerInfoTarget(@Body() body: { serverName: string; channelId: string; messageId: string }) {
    return this.botzeiService.addServerInfoTarget(body.serverName, body.channelId, body.messageId);
  }

  @Delete('server-info-targets/:id')
  @UseGuards(ApiKeyGuard)
  async removeServerInfoTarget(@Param('id') id: string) {
    return this.botzeiService.removeServerInfoTarget(parseInt(id, 10));
  }

  // ---------------------------------------------------------------------------
  // Game Servers
  // ---------------------------------------------------------------------------

  @Get('game-servers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async getGameServers(@Query('queueId') queueId?: string) {
    return this.botzeiService.getGameServers(queueId);
  }

  @Post('game-servers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async createGameServer(@Body() body: { queueId: string; name: string; ip: string; port: number }) {
    return this.botzeiService.createGameServer(body);
  }

  @Patch('game-servers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async updateGameServer(@Param('id') id: string, @Body() body: any) {
    return this.botzeiService.updateGameServer(id, body);
  }

  @Delete('game-servers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async deleteGameServer(@Param('id') id: string) {
    return this.botzeiService.deleteGameServer(id);
  }

  // API-key endpoints for game servers to toggle availability
  @Patch('game-servers/:id/available')
  @UseGuards(ApiKeyGuard)
  async setServerAvailability(@Param('id') id: string, @Body() body: { available: boolean }) {
    return this.botzeiService.setGameServerAvailability(id, body.available);
  }

  @Patch('game-servers/by-name/:name/available')
  @UseGuards(ApiKeyGuard)
  async setServerAvailabilityByName(@Param('name') name: string, @Body() body: { available: boolean }) {
    return this.botzeiService.setGameServerAvailabilityByName(name, body.available);
  }

  @Get('game-servers/:queueId/available')
  @UseGuards(ApiKeyGuard)
  async getAvailableServer(@Param('queueId') queueId: string) {
    return this.botzeiService.getAvailableServer(queueId);
  }

  @Get('pluto-queue-state')
  @UseGuards(ApiKeyGuard)
  async getPlutoQueueState() {
    return this.botzeiService.getPlutoQueueState();
  }

  @Patch('pluto-queue-state')
  @UseGuards(ApiKeyGuard)
  async setPlutoQueueState(@Body() body: any) {
    return this.botzeiService.setPlutoQueueState(body);
  }

  @Get('queue-state')
  @UseGuards(ApiKeyGuard)
  async getQueueState() {
    return this.botzeiService.getQueueState();
  }

  @Patch('queue-state')
  @UseGuards(ApiKeyGuard)
  async setQueueState(@Body() body: any) {
    return this.botzeiService.setQueueState(body);
  }

  @Post('channel-message')
  @UseGuards(ApiKeyGuard)
  async sendChannelMessage(
    @Body() body: { channelId: string; message?: string; embed?: any },
  ) {
    const success = await this.botzeiService.sendChannelMessage({
      channelId: body.channelId || '1465512337183211563',
      message: body.message,
      embed: body.embed,
    });

    return { success };
  }

  @Post('bulk-dm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  async bulkDm(
    @Body() body: { discordIds: string[]; message: string },
  ) {
    if (!body.discordIds?.length || !body.message?.trim()) {
      return { sent: 0, failed: 0, errors: ['discordIds and message are required'] };
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const discordId of body.discordIds) {
      const success = await this.botzeiService.sendDm({
        discordId,
        message: body.message,
      });
      if (success) {
        sent++;
      } else {
        failed++;
        errors.push(discordId);
      }
    }

    return { sent, failed, errors };
  }
}
