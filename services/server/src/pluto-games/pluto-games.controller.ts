import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { PlutoGamesService } from './pluto-games.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { BotzeiService } from '../botzei/botzei.service';

@Controller()
export class PlutoGamesController {
  constructor(
    private readonly plutoGamesService: PlutoGamesService,
    private readonly botzeiService: BotzeiService,
  ) {}

  @Post('pluto-game-result')
  @UseGuards(ApiKeyGuard)
  async recordResult(@Body() body: {
    player1Id: string;
    player1Name: string;
    player2Id: string;
    player2Name: string;
    player1Score: number;
    player2Score: number;
    mapName: string;
    platform?: string;
  }) {
    return this.plutoGamesService.recordResult(body);
  }

  @Post('queue-game-result')
  @UseGuards(ApiKeyGuard)
  async queueGameResult(@Body() body: {
    serverName: string;
    player1Name: string;
    player2Name: string;
    player1Score: number;
    player2Score: number;
    mapName: string;
    platform?: string;
  }) {
    if (!body.serverName?.trim()) {
      throw new BadRequestException('serverName is required');
    }
    return this.plutoGamesService.recordQueueResult(body);
  }

  @Post('server-info')
  @UseGuards(ApiKeyGuard)
  async serverInfo(@Body() body: {
    player1Name: string;
    player2Name: string;
    player1Score: number;
    player2Score: number;
    map: string;
    server: string;
    spectatorNames?: string[];
  }) {
    if (!body.server?.trim()) {
      throw new BadRequestException('server name is required');
    }
    await this.botzeiService.sendServerInfo(body);
    return { received: true };
  }
}
