import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Match } from '../matches/match.entity';
import { LeaderboardEntry } from '../leaderboards/leaderboard-entry.entity';
import { TournamentMatch } from '../tournaments/tournament-match.entity';
import { Tournament } from '../tournaments/tournament.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DiscordUsernameSyncService } from './discord-username-sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Match, LeaderboardEntry, TournamentMatch, Tournament])],
  providers: [UsersService, DiscordUsernameSyncService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
