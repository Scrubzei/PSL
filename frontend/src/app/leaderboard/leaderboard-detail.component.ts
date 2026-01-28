import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LeaderboardChallengeModalComponent } from './leaderboard-challenge-modal.component';
import { AuthService } from '../auth/auth.service';
import { AuthModalComponent } from '../auth/auth-modal/auth-modal.component';
import { ChallengesService } from '../challenges/challenges.service';
import { LeaderboardsService, LeaderboardEntry, Leaderboard } from './leaderboards.service';
import { ThemeService, Platform } from '../shared/theme.service';
import { switchMap, forkJoin } from 'rxjs';

interface DisplayEntry {
  id: string;
  rank: number;
  userId: string;
  username: string;
  score: number;
  wins: number;
  losses: number;
}

@Component({
  selector: 'app-leaderboard-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-wrapper">
      <!-- Background image -->
      <div class="bg-image" [style.background-image]="'url(assets/games/' + game + '.webp)'"></div>

      <!-- Background decorations -->
      <div class="bg-decoration">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="grid-lines"></div>
        <div class="noise-overlay"></div>
      </div>

      <div class="leaderboard-detail-container">
      <div class="header">
        <div class="title-row">
          <h1>{{ game }}</h1>
          <span class="platform-badge">{{ platform }}</span>
        </div>
        @if (!isSignedUp && !loading) {
          <button mat-raised-button color="primary" class="signup-btn" (click)="signUp()">
            <mat-icon>add</mat-icon>
            <span>Sign Up</span>
          </button>
        }
      </div>

      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading leaderboard...</p>
        </div>
      } @else {
        <mat-card>
          <mat-tab-group (selectedTabChange)="onTabChange($event)">
            <mat-tab label="Ranked">
              <div class="table-container">
                @if (rankedData.length === 0) {
                  <div class="empty-state">
                    <mat-icon>leaderboard</mat-icon>
                    <p>No players yet. Be the first to sign up!</p>
                  </div>
                } @else {
                  <table mat-table [dataSource]="rankedData">
                    <ng-container matColumnDef="rank">
                      <th mat-header-cell *matHeaderCellDef>Rank</th>
                      <td mat-cell *matCellDef="let entry" [class]="getRankClass(entry.rank)">
                        {{ entry.rank }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="username">
                      <th mat-header-cell *matHeaderCellDef>Player</th>
                      <td mat-cell *matCellDef="let entry">{{ entry.username }}</td>
                    </ng-container>

                    <ng-container matColumnDef="score">
                      <th mat-header-cell *matHeaderCellDef>ELO</th>
                      <td mat-cell *matCellDef="let entry">{{ entry.score }}</td>
                    </ng-container>

                    <ng-container matColumnDef="wins">
                      <th mat-header-cell *matHeaderCellDef>W</th>
                      <td mat-cell *matCellDef="let entry" class="wins">{{ entry.wins }}</td>
                    </ng-container>

                    <ng-container matColumnDef="losses">
                      <th mat-header-cell *matHeaderCellDef>L</th>
                      <td mat-cell *matCellDef="let entry" class="losses">{{ entry.losses }}</td>
                    </ng-container>

                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef></th>
                      <td mat-cell *matCellDef="let entry">
                        @if (entry.userId !== currentUserId && isSignedUp) {
                          <button
                            mat-icon-button
                            color="accent"
                            class="challenge-btn mobile-only"
                            (click)="openChallengeModal(entry, 'RANKED')">
                            <mat-icon fontSet="material-symbols-outlined">swords</mat-icon>
                          </button>
                          <button
                            mat-raised-button
                            color="accent"
                            class="challenge-btn desktop-only"
                            (click)="openChallengeModal(entry, 'RANKED')">
                            Challenge
                          </button>
                        }
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                  </table>
                }
              </div>
            </mat-tab>

            <mat-tab label="XP">
              <div class="table-container">
                @if (xpData.length === 0) {
                  <div class="empty-state">
                    <mat-icon>leaderboard</mat-icon>
                    <p>No players yet. Be the first to sign up!</p>
                  </div>
                } @else {
                  <table mat-table [dataSource]="xpData">
                    <ng-container matColumnDef="rank">
                      <th mat-header-cell *matHeaderCellDef>Rank</th>
                      <td mat-cell *matCellDef="let entry" [class]="getRankClass(entry.rank)">
                        {{ entry.rank }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="username">
                      <th mat-header-cell *matHeaderCellDef>Player</th>
                      <td mat-cell *matCellDef="let entry">{{ entry.username }}</td>
                    </ng-container>

                    <ng-container matColumnDef="score">
                      <th mat-header-cell *matHeaderCellDef>XP</th>
                      <td mat-cell *matCellDef="let entry">{{ entry.score | number }}</td>
                    </ng-container>

                    <ng-container matColumnDef="wins">
                      <th mat-header-cell *matHeaderCellDef>W</th>
                      <td mat-cell *matCellDef="let entry" class="wins">{{ entry.wins }}</td>
                    </ng-container>

                    <ng-container matColumnDef="losses">
                      <th mat-header-cell *matHeaderCellDef>L</th>
                      <td mat-cell *matCellDef="let entry" class="losses">{{ entry.losses }}</td>
                    </ng-container>

                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef></th>
                      <td mat-cell *matCellDef="let entry">
                        @if (entry.userId !== currentUserId && isSignedUp) {
                          <button
                            mat-icon-button
                            color="accent"
                            class="challenge-btn mobile-only"
                            (click)="openChallengeModal(entry, 'XP')">
                            <mat-icon fontSet="material-symbols-outlined">swords</mat-icon>
                          </button>
                          <button
                            mat-raised-button
                            color="accent"
                            class="challenge-btn desktop-only"
                            (click)="openChallengeModal(entry, 'XP')">
                            Challenge
                          </button>
                        }
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                  </table>
                }
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card>
      }
    </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      position: relative;
      background: #121212;
      min-height: 100%;
    }

    .bg-image {
      position: fixed;
      inset: 0;
      top: 64px;
      background-size: cover;
      background-position: center;
      z-index: 0;
      pointer-events: none;

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
      }
    }

    .bg-decoration {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 1;
    }

    .gradient-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.3;
      transition: background 0.5s ease;

      &.orb-1 {
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(var(--theme-primary-rgb, 0, 150, 255), 0.3) 0%, transparent 70%);
        top: -150px;
        right: -100px;
      }

      &.orb-2 {
        width: 350px;
        height: 350px;
        background: radial-gradient(circle, rgba(var(--theme-primary-rgb, 0, 150, 255), 0.2) 0%, transparent 70%);
        bottom: -100px;
        left: -100px;
      }
    }

    .grid-lines {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 80px 80px;
      mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%);
    }

    .noise-overlay {
      position: absolute;
      inset: 0;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }

    .leaderboard-detail-container {
      position: relative;
      z-index: 1;
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .table-container {
      padding: 16px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    table {
      width: 100%;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;

      h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 600;
        text-transform: uppercase;
        color: white;
      }
    }

    .platform-badge {
      padding: 6px 14px;
      background: var(--theme-primary, #bf2120);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: white;
    }

    .signup-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }


    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: rgba(255, 255, 255, 0.5);

      p {
        margin-top: 16px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: rgba(255, 255, 255, 0.5);

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.5;
        margin-bottom: 16px;
        color: var(--theme-primary-bright, #00b4ff);
        transition: color 0.3s ease;
      }

      p {
        margin: 0;
        font-size: 16px;
      }
    }

    .rank-1 {
      color: #FFD700 !important;
      font-weight: 700;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }

    .rank-2 {
      color: #C0C0C0 !important;
      font-weight: 600;
    }

    .rank-3 {
      color: #CD7F32 !important;
      font-weight: 600;
    }

    .wins {
      color: #4caf50 !important;
    }

    .losses {
      color: #f44336 !important;
    }

    mat-card {
      padding: 0;
    }

    .desktop-only {
      display: inline-flex;
    }

    .mobile-only {
      display: none;
    }

    .challenge-btn.mobile-only {
      color: var(--theme-primary-bright, #64b5f6) !important;
    }

    @media (max-width: 768px) {
      .desktop-only {
        display: none !important;
      }

      .mobile-only {
        display: inline-flex !important;
      }

      // Hide score column on mobile
      .mat-column-score {
        display: none;
      }

      .leaderboard-detail-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .title-row {
        h1 {
          font-size: 24px;
        }
      }

      .platform-badge {
        padding: 5px 10px;
        font-size: 11px;
      }

      .signup-btn {
        width: 100%;
        justify-content: center;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        background: linear-gradient(135deg, var(--theme-primary, #bf2120) 0%, var(--theme-primary-bright, #ff4444) 100%) !important;
        box-shadow: 0 4px 15px rgba(var(--theme-primary-rgb, 191, 33, 32), 0.3);
      }
    }

    @media (max-width: 480px) {
      .leaderboard-detail-container {
        padding: 12px;
      }

      .header h1 {
        font-size: 20px;
      }

      .table-container {
        padding: 12px 8px;
      }
    }
  `]
})
export class LeaderboardDetailComponent implements OnInit {
  game = '';
  platform = '';
  currentTab: 'RANKED' | 'XP' = 'RANKED';
  displayedColumns = ['rank', 'username', 'score', 'wins', 'losses', 'actions'];

  leaderboard: Leaderboard | null = null;
  rankedData: DisplayEntry[] = [];
  xpData: DisplayEntry[] = [];
  isSignedUp = false;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private challengesService: ChallengesService,
    private leaderboardsService: LeaderboardsService,
    private themeService: ThemeService
  ) {}

  get currentUserId(): string | null {
    return this.authService.currentUser()?.id ?? null;
  }

  ngOnInit(): void {
    this.game = this.route.snapshot.paramMap.get('game') || '';
    this.platform = this.route.snapshot.paramMap.get('platform') || '';

    // Set theme based on platform
    const platformMap: Record<string, Platform> = {
      'plutonium': 'Plutonium',
      'xbox': 'Xbox',
      'ps3': 'PS3'
    };
    const themePlatform = platformMap[this.platform.toLowerCase()];
    if (themePlatform) {
      this.themeService.setPlatform(themePlatform);
    }

    this.loadLeaderboardData();
  }

  private loadLeaderboardData(): void {
    this.loading = true;

    // First get the leaderboard by game and platform
    this.leaderboardsService.getByGameAndPlatform(this.game, this.platform).subscribe({
      next: (leaderboard) => {
        this.leaderboard = leaderboard;
        // Load entries (public)
        forkJoin({
          ranked: this.leaderboardsService.getEntries(leaderboard.id, 'ranked'),
          xp: this.leaderboardsService.getEntries(leaderboard.id, 'xp')
        }).subscribe({
          next: (results) => {
            this.rankedData = results.ranked.map(e => this.mapToDisplayEntry(e, 'ranked'));
            this.xpData = results.xp.map(e => this.mapToDisplayEntry(e, 'xp'));
            this.loading = false;

            // Check if user is signed up (only if authenticated)
            if (this.authService.isAuthenticated()) {
              this.leaderboardsService.getMyEntry(leaderboard.id).subscribe({
                next: (myEntry) => {
                  this.isSignedUp = myEntry.isSignedUp;
                },
                error: () => {
                  this.isSignedUp = false;
                }
              });
            } else {
              this.isSignedUp = false;
            }
          },
          error: () => {
            this.snackBar.open('Failed to load leaderboard entries', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      },
      error: () => {
        this.snackBar.open('Failed to load leaderboard', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private mapToDisplayEntry(entry: LeaderboardEntry, type: 'ranked' | 'xp'): DisplayEntry {
    return {
      id: entry.id,
      rank: entry.rank,
      userId: entry.userId,
      username: entry.username,
      score: type === 'ranked' ? entry.rankScore : entry.xp,
      wins: entry.wins,
      losses: entry.losses
    };
  }

  signUp(): void {
    if (!this.leaderboard) return;

    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      // Store pending action and show auth modal
      this.authService.storePendingAction({
        type: 'LEADERBOARD_SIGNUP',
        payload: { leaderboardId: this.leaderboard.id },
        returnUrl: this.router.url
      });
      this.dialog.open(AuthModalComponent, {
        width: '400px',
        data: { message: 'Sign in to join this leaderboard' }
      });
      return;
    }

    this.leaderboardsService.signup(this.leaderboard.id).subscribe({
      next: () => {
        this.snackBar.open('Successfully signed up for the leaderboard!', 'Close', { duration: 3000 });
        this.loadLeaderboardData(); // Reload to show updated list
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to sign up', 'Close', { duration: 3000 });
      }
    });
  }

  onTabChange(event: any): void {
    this.currentTab = event.index === 0 ? 'RANKED' : 'XP';
  }

  getRankClass(rank: number): string {
    if (rank <= 3) {
      return `rank-${rank}`;
    }
    return '';
  }

  openChallengeModal(entry: DisplayEntry, type: 'RANKED' | 'XP'): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      // Store pending action and show auth modal
      this.authService.storePendingAction({
        type: 'CHALLENGE_USER',
        payload: {
          opponentId: entry.userId,
          opponentUsername: entry.username,
          game: this.game,
          platform: this.platform,
          matchType: type
        },
        returnUrl: this.router.url
      });
      this.dialog.open(AuthModalComponent, {
        width: '400px',
        data: { message: `Sign in to challenge ${entry.username}` }
      });
      return;
    }

    const dialogRef = this.dialog.open(LeaderboardChallengeModalComponent, {
      width: '500px',
      panelClass: 'challenge-modal-panel',
      data: {
        opponent: { id: entry.userId, username: entry.username },
        game: this.game,
        platform: this.platform,
        type
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.leaderboard) {
        this.challengesService.createChallenge({
          challengeeId: result.opponent.id,
          leaderboardId: this.leaderboard.id,
          type: result.type,
          bestOf: result.bestOf,
          selectedMaps: result.maps,
          linkOnly: result.linkOnly || false
        }).subscribe({
          next: () => {
            this.snackBar.open('Challenge sent!', 'Close', { duration: 3000 });
          },
          error: (err) => {
            const existingChallengeId = err.error?.existingChallengeId;
            if (existingChallengeId) {
              const snackBarRef = this.snackBar.open(
                err.error?.message || 'Active challenge already exists',
                'View Challenge',
                { duration: 8000 }
              );
              snackBarRef.onAction().subscribe(() => {
                this.router.navigate(['/challenges', existingChallengeId]);
              });
            } else {
              this.snackBar.open(err.error?.message || 'Failed to send challenge', 'Close', { duration: 3000 });
            }
          }
        });
      }
    });
  }
}
