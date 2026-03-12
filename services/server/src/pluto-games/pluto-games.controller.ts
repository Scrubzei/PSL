import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PlutoGamesService } from './pluto-games.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

@Controller()
export class PlutoGamesController {
  constructor(private readonly plutoGamesService: PlutoGamesService) {}

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
  }) {
    return this.plutoGamesService.recordResult(body);
  }
}
