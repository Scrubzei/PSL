import 'dotenv/config';
import { DataSource } from 'typeorm';
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
import { InitialSchema1737391000000 } from './migrations/1737391000000-InitialSchema';
import { CreateMatchesTables1737400000000 } from './migrations/1737400000000-CreateMatchesTables';
import { AddChallengeNotificationSystem1737500000000 } from './migrations/1737500000000-AddChallengeNotificationSystem';
import { AddMatchResultReporting1737600000000 } from './migrations/1737600000000-AddMatchResultReporting';
import { AddTournamentSystem1737700000000 } from './migrations/1737700000000-AddTournamentSystem';
import { AddDiscordAuth1737800000000 } from './migrations/1737800000000-AddDiscordAuth';
import { AddMatchLinkOnly1737900000000 } from './migrations/1737900000000-AddMatchLinkOnly';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'appdb',
  entities: [User, Game, GameMap, Platform, Leaderboard, LeaderboardEntry, Match, Notification, Tournament, TournamentParticipant, TournamentMatch],
  migrations: [
    InitialSchema1737391000000,
    CreateMatchesTables1737400000000,
    AddChallengeNotificationSystem1737500000000,
    AddMatchResultReporting1737600000000,
    AddTournamentSystem1737700000000,
    AddDiscordAuth1737800000000,
    AddMatchLinkOnly1737900000000,
  ],
  synchronize: false,
});
