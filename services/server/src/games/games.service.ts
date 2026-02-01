import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './game.entity';
import { GameMap } from './game-map.entity';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(GameMap)
    private gameMapsRepository: Repository<GameMap>,
  ) {}

  async findAll(): Promise<Game[]> {
    return this.gamesRepository.find();
  }

  async findByName(name: string): Promise<Game | undefined> {
    return this.gamesRepository.findOne({ where: { name } });
  }

  async findMapsByGameName(gameName: string): Promise<GameMap[]> {
    return this.gameMapsRepository
      .createQueryBuilder('gm')
      .innerJoin('gm.game', 'g')
      .where('LOWER(g.name) = LOWER(:gameName)', { gameName })
      .getMany();
  }

  async findMapsByGameId(gameId: string): Promise<GameMap[]> {
    return this.gameMapsRepository.find({ where: { gameId } });
  }
}
