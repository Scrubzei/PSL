import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './tournament.entity';
import { TournamentParticipant } from './tournament-participant.entity';
import { TournamentMatch } from './tournament-match.entity';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tournament, TournamentParticipant, TournamentMatch]),
    NotificationsModule,
    UsersModule,
    GamesModule,
  ],
  providers: [TournamentsService],
  controllers: [TournamentsController],
  exports: [TournamentsService],
})
export class TournamentsModule {}
