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
// NOT RELEASED YET - Challenge feature imports
// import { LeaderboardChallengeModalComponent } from './leaderboard-challenge-modal.component';
// import { ChallengesService } from '../challenges/challenges.service';
import { AuthService } from '../auth/auth.service';
import { AuthModalComponent } from '../auth/auth-modal/auth-modal.component';
import { LeaderboardsService, LeaderboardEntry, Leaderboard } from './leaderboards.service';
import { ThemeService, Platform } from '../shared/theme.service';
import { forkJoin } from 'rxjs';

interface DisplayEntry {
  id: string;
  rank: number;
  userId: string;
  username: string;
  score: number;
  wins: number;
  losses: number;
  placeholder?: boolean;
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
      <div class="bg-image" [style.background-image]="'url(' + gameImage + ')'"></div>
      <div class="bg-overlay"></div>
      <div class="bg-glow"></div>

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
                <div class="ranked-notice">
                  <mat-icon>info</mat-icon>
                  <p>The leaderboard system is currently being built. Stay tuned!</p>
                </div>
                <table mat-table [dataSource]="rankedData">
                    <ng-container matColumnDef="rank">
                      <th mat-header-cell *matHeaderCellDef>Rank</th>
                      <td mat-cell *matCellDef="let entry" [class]="getRankClass(entry.rank)">
                        {{ entry.rank }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="username">
                      <th mat-header-cell *matHeaderCellDef>Player</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder">
                        {{ entry.placeholder ? '?' : entry.username }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="score">
                      <th mat-header-cell *matHeaderCellDef>ELO</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder">
                        {{ entry.placeholder ? '—' : entry.score }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="wins">
                      <th mat-header-cell *matHeaderCellDef>W</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder" [class.wins]="!entry.placeholder">
                        {{ entry.placeholder ? '—' : entry.wins }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="losses">
                      <th mat-header-cell *matHeaderCellDef>L</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder" [class.losses]="!entry.placeholder">
                        {{ entry.placeholder ? '—' : entry.losses }}
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.placeholder-row]="row.placeholder"></tr>
                  </table>
              </div>
            </mat-tab>

            <mat-tab label="XP">
              <div class="table-container">
                <div class="ranked-notice">
                  <mat-icon>info</mat-icon>
                  <p>The leaderboard system is currently being built. Stay tuned!</p>
                </div>
                <table mat-table [dataSource]="xpData">
                    <ng-container matColumnDef="rank">
                      <th mat-header-cell *matHeaderCellDef>Rank</th>
                      <td mat-cell *matCellDef="let entry" [class]="getRankClass(entry.rank)">
                        {{ entry.rank }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="username">
                      <th mat-header-cell *matHeaderCellDef>Player</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder">
                        {{ entry.placeholder ? '?' : entry.username }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="score">
                      <th mat-header-cell *matHeaderCellDef>XP</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder">
                        {{ entry.placeholder ? '—' : (entry.score | number) }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="wins">
                      <th mat-header-cell *matHeaderCellDef>W</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder" [class.wins]="!entry.placeholder">
                        {{ entry.placeholder ? '—' : entry.wins }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="losses">
                      <th mat-header-cell *matHeaderCellDef>L</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder" [class.losses]="!entry.placeholder">
                        {{ entry.placeholder ? '—' : entry.losses }}
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;" [class.placeholder-row]="row.placeholder"></tr>
                  </table>
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
      opacity: 0.5;
      transition: opacity 0.3s ease;
    }

    .bg-overlay {
      position: fixed;
      inset: 0;
      top: 64px;
      background: linear-gradient(
        135deg,
        rgba(0, 0, 0, 0.9) 0%,
        rgba(0, 0, 0, 0.7) 50%,
        rgba(0, 0, 0, 0.85) 100%
      );
      z-index: 0;
      pointer-events: none;
    }

    .bg-glow {
      position: fixed;
      inset: 0;
      top: 64px;
      background: radial-gradient(ellipse at 50% 0%, rgba(var(--theme-primary-rgb), 0.15) 0%, transparent 50%);
      z-index: 0;
      pointer-events: none;
      transition: background 0.5s ease;
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
      opacity: 0.4;
      transition: background 0.5s ease;

      &.orb-1 {
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(var(--theme-primary-rgb), 0.35) 0%, transparent 70%);
        top: -200px;
        right: -150px;
      }

      &.orb-2 {
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(var(--theme-primary-rgb), 0.25) 0%, transparent 70%);
        bottom: -150px;
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

    .placeholder-row {
      opacity: 0.35;
    }

    .placeholder-cell {
      color: rgba(255, 255, 255, 0.3) !important;
    }

    mat-card {
      padding: 0;
    }

    .ranked-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 16px;

      mat-icon {
        color: rgba(255, 255, 255, 0.6);
        flex-shrink: 0;
      }

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        line-height: 1.4;
      }
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
  // NOT RELEASED YET - was ['rank', 'username', 'score', 'wins', 'losses', 'actions']
  displayedColumns = ['rank', 'username', 'score', 'wins', 'losses'];

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
    // NOT RELEASED YET
    // private challengesService: ChallengesService,
    private leaderboardsService: LeaderboardsService,
    private themeService: ThemeService
  ) {}

  get currentUserId(): string | null {
    return this.authService.currentUser()?.id ?? null;
  }

  get gameImage(): string {
    const gameLower = this.game.toLowerCase();
    return `/assets/games/${gameLower}.webp`;
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
            this.rankedData = this.padToTen(results.ranked.map(e => this.mapToDisplayEntry(e, 'ranked')));
            this.xpData = this.padToTen(results.xp.map(e => this.mapToDisplayEntry(e, 'xp')));
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
      error: (err) => {
        // If leaderboard doesn't exist yet (404), just show empty state
        if (err.status === 404) {
          this.rankedData = this.padToTen([]);
          this.xpData = this.padToTen([]);
          this.loading = false;
        } else {
          this.snackBar.open('Failed to load leaderboard', 'Close', { duration: 3000 });
          this.loading = false;
        }
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

  private padToTen(entries: DisplayEntry[]): DisplayEntry[] {
    const padded = [...entries];
    while (padded.length < 10) {
      padded.push({
        id: '',
        rank: padded.length + 1,
        userId: '',
        username: '',
        score: 0,
        wins: 0,
        losses: 0,
        placeholder: true,
      });
    }
    return padded;
  }

  getRankClass(rank: number): string {
    if (rank <= 3) {
      return `rank-${rank}`;
    }
    return '';
  }

  // NOT RELEASED YET - Challenge feature
  // openChallengeModal(entry: DisplayEntry, type: 'RANKED' | 'XP'): void {
  //   if (!this.authService.isAuthenticated()) {
  //     this.authService.storePendingAction({
  //       type: 'CHALLENGE_USER',
  //       payload: {
  //         opponentId: entry.userId,
  //         opponentUsername: entry.username,
  //         game: this.game,
  //         platform: this.platform,
  //         matchType: type
  //       },
  //       returnUrl: this.router.url
  //     });
  //     this.dialog.open(AuthModalComponent, {
  //       width: '400px',
  //       data: { message: `Sign in to challenge ${entry.username}` }
  //     });
  //     return;
  //   }
  //
  //   const dialogRef = this.dialog.open(LeaderboardChallengeModalComponent, {
  //     width: '500px',
  //     panelClass: 'challenge-modal-panel',
  //     data: {
  //       opponent: { id: entry.userId, username: entry.username },
  //       game: this.game,
  //       platform: this.platform,
  //       type
  //     }
  //   });
  //
  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result && this.leaderboard) {
  //       this.challengesService.createChallenge({
  //         challengeeId: result.opponent.id,
  //         leaderboardId: this.leaderboard.id,
  //         type: result.type,
  //         bestOf: result.bestOf,
  //         selectedMaps: result.maps,
  //         linkOnly: result.linkOnly || false
  //       }).subscribe({
  //         next: () => {
  //           this.snackBar.open('Challenge sent!', 'Close', { duration: 3000 });
  //         },
  //         error: (err) => {
  //           const existingChallengeId = err.error?.existingChallengeId;
  //           if (existingChallengeId) {
  //             const snackBarRef = this.snackBar.open(
  //               err.error?.message || 'Active challenge already exists',
  //               'View Challenge',
  //               { duration: 8000 }
  //             );
  //             snackBarRef.onAction().subscribe(() => {
  //               this.router.navigate(['/challenges', existingChallengeId]);
  //             });
  //           } else {
  //             this.snackBar.open(err.error?.message || 'Failed to send challenge', 'Close', { duration: 3000 });
  //           }
  //         }
  //       });
  //     }
  //   });
  // }
}
