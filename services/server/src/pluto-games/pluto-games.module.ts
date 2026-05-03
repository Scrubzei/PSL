import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlutoGame } from './pluto-game.entity';
import { PlutoGamesService } from './pluto-games.service';
import { PlutoGamesController } from './pluto-games.controller';
import { MatchesModule } from '../matches/matches.module';
import { UsersModule } from '../users/users.module';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlutoGame]),
    MatchesModule,
    UsersModule,
    LeaderboardsModule,
  ],
  controllers: [PlutoGamesController],
  providers: [PlutoGamesService],
  exports: [PlutoGamesService],
})
export class PlutoGamesModule {}
