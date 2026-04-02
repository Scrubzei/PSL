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
import { RulesComponent } from './rules/rules.component';
import { DownloadComponent } from './download/download.component';
import { MatchfinderComponent } from './matchfinder/matchfinder.component';
import { MatchfinderAllComponent } from './matchfinder/matchfinder-all.component';
import { MatchfinderDetailComponent } from './matchfinder/matchfinder-detail.component';
import { homeRedirectGuard } from './auth/home-redirect.guard';
import { refOrAdminGuard } from './auth/ref-or-admin.guard';
import { DisputesPageComponent } from './disputes/disputes-page.component';

export const routes: Routes = [
  { path: '', canActivate: [homeRedirectGuard], children: [] },
  { path: 'discord-callback', component: DiscordCallbackComponent },
  { path: 'choose-username', component: UsernameSelectionComponent },
  { path: 'match/:token', component: MatchShareComponent },
  { path: 'dev-login', component: DevLoginComponent },
  // Public routes - viewable without login
  { path: 'download', component: DownloadComponent },
  { path: 'rules', component: RulesComponent },
  { path: 'leaderboards', component: LeaderboardComponent },
  { path: 'leaderboards/:game/:platform', component: LeaderboardDetailComponent },
  { path: 'users', component: UsersListComponent },
  { path: 'users/:id', component: UserProfileComponent },
  { path: 'matchfinder', component: MatchfinderComponent },
  { path: 'matchfinder/all', component: MatchfinderAllComponent },
  { path: 'matchfinder/:game/:platform', component: MatchfinderDetailComponent },
  { path: 'challenges', component: ChallengesComponent },
  { path: 'challenges/:id', component: ChallengeDetailComponent },
  {
    path: 'disputes',
    component: DisputesPageComponent,
    canActivate: [authGuard, refOrAdminGuard],
  },
  { path: 'tournaments', component: TournamentsListComponent },
  { path: 'tournaments/create', component: TournamentCreateComponent, canActivate: [authGuard, adminGuard] },
  { path: 'tournaments/:id', component: TournamentDetailComponent },
  { path: 'tournaments/:id/bracket', component: TournamentBracketComponent },
  // Protected routes - require login
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
];
