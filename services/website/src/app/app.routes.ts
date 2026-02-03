import { Routes } from '@angular/router';
import { DiscordCallbackComponent } from './auth/discord-callback/discord-callback.component';
import { UsernameSelectionComponent } from './auth/username-selection/username-selection.component';
import { DevLoginComponent } from './auth/dev-login/dev-login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';
import { LeaderboardDetailComponent } from './leaderboard/leaderboard-detail.component';
import { UsersListComponent } from './users/users-list.component';
import { UserProfileComponent } from './users/user-profile.component';
import { ChallengesComponent } from './challenges/challenges.component';
import { ChallengeDetailComponent } from './challenges/challenge-detail.component';
import { MatchShareComponent } from './challenges/match-share.component';
import { TournamentsListComponent } from './tournaments/tournaments-list.component';
import { TournamentDetailComponent } from './tournaments/tournament-detail.component';
import { TournamentBracketComponent } from './tournaments/tournament-bracket.component';
import { TournamentCreateComponent } from './tournaments/tournament-create.component';
import { authGuard } from './auth/auth.guard';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/leaderboards', pathMatch: 'full' },
  { path: 'discord-callback', component: DiscordCallbackComponent },
  { path: 'choose-username', component: UsernameSelectionComponent },
  { path: 'match/:token', component: MatchShareComponent },
  { path: 'dev-login', component: DevLoginComponent },
  // Public routes - viewable without login
  { path: 'leaderboards', component: LeaderboardComponent },
  { path: 'leaderboards/:game/:platform', component: LeaderboardDetailComponent },
  { path: 'users', component: UsersListComponent },
  { path: 'users/:id', component: UserProfileComponent },
  { path: 'challenges', component: ChallengesComponent },
  { path: 'challenges/:id', component: ChallengeDetailComponent },
  { path: 'tournaments', component: TournamentsListComponent },
  { path: 'tournaments/create', component: TournamentCreateComponent, canActivate: [authGuard, adminGuard] },
  { path: 'tournaments/:id', component: TournamentDetailComponent },
  { path: 'tournaments/:id/bracket', component: TournamentBracketComponent },
  // Protected routes - require login
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
];
