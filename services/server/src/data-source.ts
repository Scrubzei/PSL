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
import { RemoveWinsLossesColumns1738000000000 } from './migrations/1738000000000-RemoveWinsLossesColumns';
import { AddTournamentMatchMaps1738600000000 } from './migrations/1738600000000-AddTournamentMatchMaps';
import { AddTournamentSlug1738700000000 } from './migrations/1738700000000-AddTournamentSlug';
import { SeedGamesPlatformsMaps1738800000000 } from './migrations/1738800000000-SeedGamesPlatformsMaps';
import { AddPlutoniumUsername1738900000000 } from './migrations/1738900000000-AddPlutoniumUsername';
import { AddTournamentRoundDeadlines1739000000000 } from './migrations/1739000000000-AddTournamentRoundDeadlines';
import { AddWithdrawalCooldown1739100000000 } from './migrations/1739100000000-AddWithdrawalCooldown';
import { AddTournamentPrizePool1739200000000 } from './migrations/1739200000000-AddTournamentPrizePool';
import { AddTournamentFeatured1739300000000 } from './migrations/1739300000000-AddTournamentFeatured';
import { AddXboxGamertag1739400000000 } from './migrations/1739400000000-AddXboxGamertag';
import { AddTournamentModalText1739500000000 } from './migrations/1739500000000-AddTournamentModalText';
import { AddTournamentSponsors1739600000000 } from './migrations/1739600000000-AddTournamentSponsors';
import { RemoveEmailColumn1739700000000 } from './migrations/1739700000000-RemoveEmailColumn';
import { AddTournamentMatchBye1739800000000 } from './migrations/1739800000000-AddTournamentMatchBye';
import { AddTournamentMatchGameMaps1739900000000 } from './migrations/1739900000000-AddTournamentMatchGameMaps';
import { AddTournamentMatchScheduledTime1740000000000 } from './migrations/1740000000000-AddTournamentMatchScheduledTime';
import { AddPlutoId1740100000000 } from './migrations/1740100000000-AddPlutoId';
import { AddCrossPlatform1740200000000 } from './migrations/1740200000000-AddCrossPlatform';
import { AddMW20191740300000000 } from './migrations/1740300000000-AddMW2019';

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
    RemoveWinsLossesColumns1738000000000,
    AddTournamentMatchMaps1738600000000,
    AddTournamentSlug1738700000000,
    SeedGamesPlatformsMaps1738800000000,
    AddPlutoniumUsername1738900000000,
    AddTournamentRoundDeadlines1739000000000,
    AddWithdrawalCooldown1739100000000,
    AddTournamentPrizePool1739200000000,
    AddTournamentFeatured1739300000000,
    AddXboxGamertag1739400000000,
    AddTournamentModalText1739500000000,
    AddTournamentSponsors1739600000000,
    RemoveEmailColumn1739700000000,
    AddTournamentMatchBye1739800000000,
    AddTournamentMatchGameMaps1739900000000,
    AddTournamentMatchScheduledTime1740000000000,
    AddPlutoId1740100000000,
    AddCrossPlatform1740200000000,
    AddMW20191740300000000,
  ],
  synchronize: false,
});
