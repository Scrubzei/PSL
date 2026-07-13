import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { MatchesModule } from './matches/matches.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { PlatformsModule } from './platforms/platforms.module';
import { BotzeiModule } from './botzei/botzei.module';
import { PlutoGamesModule } from './pluto-games/pluto-games.module';
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
import { PlutoGame } from './pluto-games/pluto-game.entity';
import { Team } from './teams/team.entity';
import { TeamMembership } from './teams/team-membership.entity';
import { TeamInvite } from './teams/team-invite.entity';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'appdb',
      entities: [User, Game, GameMap, Platform, Leaderboard, LeaderboardEntry, Match, Notification, Tournament, TournamentParticipant, TournamentMatch, PlutoGame, Team, TeamMembership, TeamInvite],
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
    BotzeiModule,
    PlutoGamesModule,
    TeamsModule,
  ],
})
export class AppModule {}
