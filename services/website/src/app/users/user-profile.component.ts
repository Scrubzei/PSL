import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UsersService, UserProfile, UserStats, RecentMatch, LeaderboardRanking, DashboardStats } from './users.service';
import { combineLatest, forkJoin, map, of, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LeaderboardsService } from '../leaderboard/leaderboards.service';
import { ChallengesService } from '../challenges/challenges.service';
import { LeaderboardChallengeModalComponent } from '../leaderboard/leaderboard-challenge-modal.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  template: `
    <div class="profile-container">
      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading profile...</p>
        </div>
      } @else if (user) {
        <div class="back-row">
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon> Back
          </button>
        </div>
        <div class="profile-header" [class.hall-of-fame]="user.hallOfFame">
          <div class="user-info">
            <h1>{{ user.username }}</h1>
            @if (user.hallOfFame) {
              <div class="hof-badge">
                <mat-icon>military_tech</mat-icon>
                <span>HALL OF FAME</span>
              </div>
            }
            <p class="member-since">Member since {{ user.createdAt | date:'MMMM yyyy' }}</p>
          </div>
        </div>

        <div class="stats-grid">
          <mat-card class="stat-card wins">
            <mat-card-content>
              <mat-icon>emoji_events</mat-icon>
              <div class="stat-value">{{ stats?.totalWins || 0 }}</div>
              <div class="stat-label">Wins</div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card losses">
            <mat-card-content>
              <mat-icon>close</mat-icon>
              <div class="stat-value">{{ stats?.totalLosses || 0 }}</div>
              <div class="stat-label">Losses</div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card winrate">
            <mat-card-content>
              <mat-icon>percent</mat-icon>
              <div class="stat-value">{{ stats?.winRate || 0 }}%</div>
              <div class="stat-label">Win Rate</div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="trophies-section">
          @if (user.hofTrophies > 0) {
            <div class="trophy hof">
              <mat-icon class="trophy-icon">emoji_events</mat-icon>
              <span class="trophy-count">{{ user.hofTrophies }}</span>
            </div>
          }
          <div class="trophy gold">
            <mat-icon class="trophy-icon">emoji_events</mat-icon>
            <span class="trophy-count">{{ user.goldTrophies }}</span>
          </div>
          <div class="trophy silver">
            <mat-icon class="trophy-icon">emoji_events</mat-icon>
            <span class="trophy-count">{{ user.silverTrophies }}</span>
          </div>
          <div class="trophy bronze">
            <mat-icon class="trophy-icon">emoji_events</mat-icon>
            <span class="trophy-count">{{ user.bronzeTrophies }}</span>
          </div>
        </div>

        @if (canChallengeXp) {
          <mat-card class="challenge-card">
            <mat-card-header>
              <mat-card-title>XP challenge</mat-card-title>
              <mat-card-subtitle>Challenge on a ladder you both joined</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="challenge-card-content">
              @if (sharedXpLeaderboards.length > 1) {
                <mat-form-field appearance="outline" class="lb-select">
                  <mat-label>Leaderboard</mat-label>
                  <mat-select [(ngModel)]="selectedXpLbId">
                    @for (lb of sharedXpLeaderboards; track lb.leaderboardId) {
                      <mat-option [value]="lb.leaderboardId">{{ lb.game }} — {{ lb.platform }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              <button mat-raised-button color="primary" (click)="openXpChallenge()">
                <mat-icon>sports_esports</mat-icon>
                Challenge
              </button>
            </mat-card-content>
          </mat-card>
        }

        @if (canChallengeRanked) {
          <mat-card class="challenge-card">
            <mat-card-header>
              <mat-card-title>Ranked challenge</mat-card-title>
              <mat-card-subtitle>Best of 3 on a ladder you both opted into for ranked</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="challenge-card-content">
              @if (sharedRankedLeaderboards.length > 1) {
                <mat-form-field appearance="outline" class="lb-select">
                  <mat-label>Leaderboard</mat-label>
                  <mat-select [(ngModel)]="selectedRankedLbId">
                    @for (lb of sharedRankedLeaderboards; track lb.leaderboardId) {
                      <mat-option [value]="lb.leaderboardId">{{ lb.game }} — {{ lb.platform }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
              <button mat-raised-button color="primary" (click)="openRankedChallenge()">
                <mat-icon>trending_up</mat-icon>
                Ranked challenge
              </button>
            </mat-card-content>
          </mat-card>
        }

        @if (showChallengeJoinHint) {
          <mat-card class="challenge-hint-card">
            <mat-card-content>
              <p class="challenge-hint-text">
                Challenge buttons only show when you share a leaderboard with this player. Join the same game and
                platform from the Leaderboards page (XP and/or ranked) first.
              </p>
            </mat-card-content>
          </mat-card>
        }

        <mat-card class="recent-matches-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>history</mat-icon>
              Recent Matches
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (!stats?.recentMatches?.length) {
              <div class="empty-state">
                <mat-icon>sports_esports</mat-icon>
                <p>No matches yet</p>
              </div>
            } @else {
              <div class="matches-list">
                @for (match of stats!.recentMatches!; track match.id) {
                  <div class="match-item" [routerLink]="['/challenges', match.id]">
                    <div class="match-info">
                      <span class="opponent-name">vs {{ match.opponent.username }}</span>
                      <span class="match-game">{{ match.game }} - {{ match.platform }}</span>
                    </div>
                    <div class="match-result" [class.win]="match.isWinner" [class.loss]="!match.isWinner">
                      @if (match.status === 'COMPLETED') {
                        @if (match.isWinner) {
                          W
                        } @else {
                          L
                        }
                      } @else {
                        {{ match.status }}
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="not-found">
          <mat-icon>person_off</mat-icon>
          <h2>User not found</h2>
          <button mat-raised-button color="primary" (click)="goBack()">Go Back</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .loading, .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px;
      color: #666;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.5;
        margin-bottom: 16px;
      }

      p, h2 {
        margin: 16px 0;
      }
    }

    .back-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }

    .profile-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
    }

    .hof-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 16px;
      background: transparent;
      border: 1px solid #FFD700;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      color: #FFD700;
      letter-spacing: 2px;
      margin-bottom: 8px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #FFD700;
      }
    }

    .profile-header.hall-of-fame {
      .user-info h1 {
        background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 3s linear infinite;
      }
    }

    @keyframes shimmer {
      0% { background-position: 0% center; }
      100% { background-position: 200% center; }
    }

    .user-info {
      text-align: center;

      h1 {
        margin: 0 0 8px 0;
        font-size: 32px;
        font-weight: 600;
      }

      .member-since {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      text-align: center;

      mat-card-content {
        padding: 24px !important;
      }

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        margin-bottom: 8px;
      }

      .stat-value {
        font-size: 36px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      &.wins {
        mat-icon, .stat-value {
          color: #4caf50;
        }
      }

      &.losses {
        mat-icon, .stat-value {
          color: #f44336;
        }
      }

      &.winrate {
        mat-icon, .stat-value {
          color: #2196f3;
        }
      }
    }

    .challenge-card {
      margin-bottom: 24px;

      mat-card-header {
        padding: 16px 16px 12px 16px;
        display: block;
      }

      mat-card-title {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.3;
      }

      mat-card-subtitle {
        margin: 0;
        line-height: 1.45;
        color: rgba(255, 255, 255, 0.55);
      }

      .challenge-card-content {
        display: flex;
        flex-direction: column;
        gap: 14px;
        align-items: flex-start;
        padding: 4px 16px 18px 16px !important;
        margin: 0;
      }

      .lb-select {
        width: 100%;
        max-width: 360px;
      }
    }

    .challenge-hint-card {
      margin-bottom: 24px;

      .challenge-hint-text {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.55);
      }
    }

    .trophies-section {
      display: flex;
      justify-content: center;
      gap: 48px;
      margin-bottom: 24px;
    }

    .trophy {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;

      .trophy-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }

      .trophy-count {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
      }

      &.gold .trophy-icon {
        color: #FFD700;
        filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4));
      }

      &.silver .trophy-icon {
        color: #C0C0C0;
        filter: drop-shadow(0 2px 4px rgba(192, 192, 192, 0.4));
      }

      &.bronze .trophy-icon {
        color: #CD7F32;
        filter: drop-shadow(0 2px 4px rgba(205, 127, 50, 0.4));
      }

      &.hof .trophy-icon {
        color: #00BFFF;
        filter: drop-shadow(0 2px 8px rgba(0, 191, 255, 0.6));
      }
    }

    .recent-matches-card {
      mat-card-header {
        margin-bottom: 16px;

        mat-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 20px;

          mat-icon {
            color: #666;
          }
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: #999;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.5;
        margin-bottom: 16px;
      }

      p {
        margin: 0;
      }
    }

    .matches-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .match-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-radius: 6px;
      background: #2a2a2a;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #333;
      }
    }

    .match-info {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .opponent-name {
        font-weight: 500;
        font-size: 14px;
        color: #fff;
      }

      .match-game {
        font-size: 12px;
        color: #888;
      }
    }

    .match-result {
      font-size: 14px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 4px;

      &.win {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }

      &.loss {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
      }
    }

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }


      .profile-header {
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .match-item {
        flex-direction: row;
        align-items: center;
      }
    }
  `]
})
export class UserProfileComponent {
  private readonly destroyRef = inject(DestroyRef);

  user: UserProfile | null = null;
  stats: UserStats | null = null;
  loading = true;
  sharedXpLeaderboards: LeaderboardRanking[] = [];
  sharedRankedLeaderboards: LeaderboardRanking[] = [];
  /** Profile user's ladders (for join hint when viewer shares none). */
  profileXpLeaderboards: LeaderboardRanking[] = [];
  profileRankedLeaderboards: LeaderboardRanking[] = [];
  selectedXpLbId: string | null = null;
  selectedRankedLbId: string | null = null;
  private profileSub: Subscription | null = null;

  /** Same logical ladder as the server (one leaderboard per game + platform). */
  private static ladderKey(r: LeaderboardRanking): string {
    return `${r.game.trim().toLowerCase()}\0${r.platform.trim().toLowerCase()}`;
  }

  constructor(
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private dialog: MatDialog,
    private leaderboardsService: LeaderboardsService,
    private challengesService: ChallengesService,
    private snackBar: MatSnackBar
  ) {
    // toObservable must run in an injection context (constructor), not ngOnInit.
    const auth$ = toObservable(this.authService.currentUser);
    combineLatest([
      this.route.paramMap.pipe(map((p) => p.get('id'))),
      auth$,
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([userId]) => {
        if (!userId) {
          this.loading = false;
          return;
        }
        this.loadUserProfile(userId);
      });
  }

  get canChallengeXp(): boolean {
    const viewer = this.authService.currentUser();
    if (!viewer || !this.user || viewer.id === this.user.id) {
      return false;
    }
    return this.sharedXpLeaderboards.length > 0;
  }

  get canChallengeRanked(): boolean {
    const viewer = this.authService.currentUser();
    if (!viewer || !this.user || viewer.id === this.user.id) {
      return false;
    }
    return this.sharedRankedLeaderboards.length > 0;
  }

  /**
   * Viewer cannot challenge on XP or ranked (no shared ladder), while this profile does play XP/ranked.
   * Not shown if they share at least one ladder for either mode — even when only XP or only ranked overlaps.
   */
  get showChallengeJoinHint(): boolean {
    const viewer = this.authService.currentUser();
    if (!viewer || !this.user || viewer.id === this.user.id) {
      return false;
    }
    if (this.sharedXpLeaderboards.length > 0 || this.sharedRankedLeaderboards.length > 0) {
      return false;
    }
    return this.profileXpLeaderboards.length > 0 || this.profileRankedLeaderboards.length > 0;
  }

  private loadUserProfile(userId: string): void {
    this.profileSub?.unsubscribe();
    const viewer = this.authService.currentUser();
    const needsDash = viewer && viewer.id !== userId;
    this.profileSub = forkJoin({
      user: this.usersService.getUserById(userId),
      stats: this.usersService.getUserStats(userId),
      themDash: needsDash ? this.usersService.getDashboardStats(userId) : of(null as DashboardStats | null),
      meDash: needsDash ? this.usersService.getDashboardStats(viewer!.id) : of(null as DashboardStats | null),
    }).subscribe({
      next: (result) => {
        this.user = result.user;
        this.stats = result.stats;
        this.sharedXpLeaderboards = [];
        this.sharedRankedLeaderboards = [];
        this.profileXpLeaderboards = [];
        this.profileRankedLeaderboards = [];
        if (result.themDash) {
          this.profileXpLeaderboards = result.themDash.leaderboardRankings.filter((r) => r.xpOptIn);
          this.profileRankedLeaderboards = result.themDash.leaderboardRankings.filter((r) => r.rankedOptIn);
        }
        if (result.themDash && result.meDash) {
          const mineXpKeys = new Set(
            result.meDash.leaderboardRankings
              .filter((r) => r.xpOptIn)
              .map((r) => UserProfileComponent.ladderKey(r)),
          );
          this.sharedXpLeaderboards = result.themDash.leaderboardRankings.filter(
            (r) => r.xpOptIn && mineXpKeys.has(UserProfileComponent.ladderKey(r)),
          );
          this.selectedXpLbId = this.sharedXpLeaderboards[0]?.leaderboardId ?? null;

          const mineRankedKeys = new Set(
            result.meDash.leaderboardRankings
              .filter((r) => r.rankedOptIn)
              .map((r) => UserProfileComponent.ladderKey(r)),
          );
          this.sharedRankedLeaderboards = result.themDash.leaderboardRankings.filter(
            (r) => r.rankedOptIn && mineRankedKeys.has(UserProfileComponent.ladderKey(r)),
          );
          this.selectedRankedLbId = this.sharedRankedLeaderboards[0]?.leaderboardId ?? null;
        }
        this.loading = false;
      },
      error: () => {
        this.user = null;
        this.loading = false;
      }
    });
  }

  openXpChallenge(): void {
    if (!this.user || !this.canChallengeXp) {
      return;
    }
    const lb =
      this.sharedXpLeaderboards.find((l) => l.leaderboardId === this.selectedXpLbId) ??
      this.sharedXpLeaderboards[0];
    if (!lb) {
      return;
    }
    this.dialog.open(LeaderboardChallengeModalComponent, {
      width: '500px',
      panelClass: 'challenge-modal-panel',
      data: {
        opponent: { id: this.user.id, username: this.user.username || 'Player' },
        game: lb.game,
        platform: lb.platform,
        type: 'XP' as const,
      },
    }).afterClosed().subscribe((result) => {
      if (!result || !this.user) {
        return;
      }
      this.leaderboardsService.getByGameAndPlatform(result.game, result.platform).subscribe({
        next: (leaderboard) => {
          this.challengesService
            .createChallenge({
              challengeeId: this.user!.id,
              leaderboardId: leaderboard.id,
              type: 'XP',
              bestOf: result.bestOf,
              selectedMaps: result.maps,
            })
            .subscribe({
              next: () => {
                this.snackBar.open('Challenge sent!', 'Close', { duration: 3000 });
              },
              error: (err) => {
                this.snackBar.open(err.error?.message || 'Failed to send challenge', 'Close', {
                  duration: 4000,
                });
              },
            });
        },
        error: () => {
          this.snackBar.open('Failed to load leaderboard', 'Close', { duration: 3000 });
        },
      });
    });
  }

  openRankedChallenge(): void {
    if (!this.user || !this.canChallengeRanked) {
      return;
    }
    const lb =
      this.sharedRankedLeaderboards.find((l) => l.leaderboardId === this.selectedRankedLbId) ??
      this.sharedRankedLeaderboards[0];
    if (!lb) {
      return;
    }
    this.dialog.open(LeaderboardChallengeModalComponent, {
      width: '500px',
      panelClass: 'challenge-modal-panel',
      data: {
        opponent: { id: this.user.id, username: this.user.username || 'Player' },
        game: lb.game,
        platform: lb.platform,
        type: 'RANKED' as const,
      },
    }).afterClosed().subscribe((result) => {
      if (!result?.maps?.length || !this.user) {
        return;
      }
      this.leaderboardsService.getByGameAndPlatform(result.game, result.platform).subscribe({
        next: (leaderboard) => {
          this.challengesService
            .createChallenge({
              challengeeId: this.user!.id,
              leaderboardId: leaderboard.id,
              type: 'RANKED',
              bestOf: 3,
              selectedMaps: result.maps,
            })
            .subscribe({
              next: () => {
                this.snackBar.open('Ranked challenge sent!', 'Close', { duration: 3000 });
              },
              error: (err) => {
                this.snackBar.open(err.error?.message || 'Failed to send challenge', 'Close', {
                  duration: 4000,
                });
              },
            });
        },
        error: () => {
          this.snackBar.open('Failed to load leaderboard', 'Close', { duration: 3000 });
        },
      });
    });
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }
}
