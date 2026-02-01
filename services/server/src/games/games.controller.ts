import { Controller, Get, Param } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private gamesService: GamesService) {}

  @Get()
  async findAll() {
    return this.gamesService.findAll();
  }

  @Get(':name/maps')
  async findMapsByGameName(@Param('name') name: string) {
    const maps = await this.gamesService.findMapsByGameName(name);
    return maps.map(m => ({ id: m.id, mapName: m.mapName }));
  }
}
