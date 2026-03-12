import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlutoGame } from './pluto-game.entity';
import { PlutoGamesService } from './pluto-games.service';
import { PlutoGamesController } from './pluto-games.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PlutoGame])],
  controllers: [PlutoGamesController],
  providers: [PlutoGamesService],
  exports: [PlutoGamesService],
})
export class PlutoGamesModule {}
