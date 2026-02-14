import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './match.entity';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match]),
    NotificationsModule,
    LeaderboardsModule,
    UsersModule,
  ],
  providers: [MatchesService],
  controllers: [MatchesController],
  exports: [MatchesService],
})
export class MatchesModule {}
