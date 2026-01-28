import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Leaderboard } from './leaderboard.entity';
import { LeaderboardEntry } from './leaderboard-entry.entity';
import { LeaderboardsService } from './leaderboards.service';
import { LeaderboardsController } from './leaderboards.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Leaderboard, LeaderboardEntry])],
  providers: [LeaderboardsService],
  controllers: [LeaderboardsController],
  exports: [LeaderboardsService],
})
export class LeaderboardsModule {}
