import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { MatchesModule } from './matches/matches.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { PlatformsModule } from './platforms/platforms.module';
import { User } from './users/user.entity';
import { Game } from './games/game.entity';
import { GameMap } from './games/game-map.entity';
import { Platform } from './platforms/platform.entity';
import { Leaderboard } from './leaderboards/leaderboard.entity';
import { LeaderboardEntry } from './leaderboards/leaderboard-entry.entity';
import { Match } from './matches/match.entity';
import { Notification } from './notifications/notification.entity';
import { Tournament } from './tournaments/tournament.entity';
import { TournamentParticipant } from './tournaments/tournament-participant.entity';
import { TournamentMatch } from './tournaments/tournament-match.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'appdb',
      entities: [User, Game, GameMap, Platform, Leaderboard, LeaderboardEntry, Match, Notification, Tournament, TournamentParticipant, TournamentMatch],
      migrations: ['dist/migrations/*.js'],
      migrationsRun: true,
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    GamesModule,
    PlatformsModule,
    MatchesModule,
    NotificationsModule,
    LeaderboardsModule,
    TournamentsModule,
  ],
})
export class AppModule {}
