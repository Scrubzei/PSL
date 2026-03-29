import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Leaderboard } from './leaderboard.entity';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { Match } from '../matches/match.entity';
import { TournamentMatch } from '../tournaments/tournament-match.entity';
import { LeaderboardsService } from './leaderboards.service';
import { LeaderboardsController } from './leaderboards.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Leaderboard, LeaderboardEntry, Match, TournamentMatch]),
    UsersModule,
  ],
  providers: [LeaderboardsService],
  controllers: [LeaderboardsController],
  exports: [LeaderboardsService],
})
export class LeaderboardsModule {}
