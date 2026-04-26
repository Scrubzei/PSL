import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../auth/auth.service';
import { UsersService, UserStats, DashboardStats, GlobalRecentWin } from '../users/users.service';
import { ChallengesService, Match } from '../challenges/challenges.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="dashboard">
      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {
        <!-- Profile Header -->
        <header class="profile-header">
          <div class="profile-info">
            <div class="avatar">
              {{ getInitial(user?.username) }}
              <span class="level-badge">{{ dashboardStats?.level || 1 }}</span>
            </div>
            <div class="profile-text">
              @if (!editingUsername) {
                <h1 class="username-display" (click)="startEditUsername()">
                  {{ user?.username }}
                  <i class="fa-solid fa-pen edit-icon"></i>
                </h1>
              } @else {
                <div class="username-edit">
                  <input
                    type="text"
                    [(ngModel)]="newUsername"
                    class="username-input"
                    (keydown.enter)="saveUsername()"
                    (keydown.escape)="cancelEditUsername()"
                    maxlength="20"
                    #usernameInput
                  />
                  <button class="username-save" (click)="saveUsername()" [disabled]="savingUsername || !newUsername.trim()">
                    @if (savingUsername) {
                      <mat-spinner diameter="16"></mat-spinner>
                    } @else {
                      Save
                    }
                  </button>
                  <button class="username-cancel" (click)="cancelEditUsername()">Cancel</button>
                </div>
              }
              <div class="xp-row">
                <span class="xp-label">Level {{ dashboardStats?.level || 1 }}</span>
                <div class="xp-track">
                  <div class="xp-fill" [style.width.%]="getXpProgress()"></div>
                </div>
                <span class="xp-amount">{{ dashboardStats?.totalXp || 0 }} XP</span>
              </div>
            </div>
          </div>
          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-num">{{ dashboardStats?.totalWins || 0 }}</span>
              <span class="stat-name">Wins</span>
            </div>
            <div class="stat-box">
              <span class="stat-num">{{ dashboardStats?.totalLosses || 0 }}</span>
              <span class="stat-name">Losses</span>
            </div>
            <div class="stat-box">
              <span class="stat-num">{{ dashboardStats?.winRate || 0 }}%</span>
              <span class="stat-name">Win Rate</span>
            </div>
          </div>
        </header>

        <!-- Plutonium Username -->
        <div class="pluto-row">
          <div class="pluto-label">
            <mat-icon>person_outline</mat-icon>
            <span>Plutonium Username</span>
          </div>
          <div class="pluto-edit">
            <input
              type="text"
              [(ngModel)]="plutoniumUsername"
              placeholder="Enter your Plutonium username"
              class="pluto-input"
              (keydown.enter)="savePlutoniumUsername()"
            />
            @if (plutoniumUsername !== (user?.plutoniumUsername || '')) {
              <button class="pluto-save" (click)="savePlutoniumUsername()" [disabled]="savingPluto">
                @if (savingPluto) {
                  <mat-spinner diameter="16"></mat-spinner>
                } @else {
                  Save
                }
              </button>
            }
          </div>
        </div>

        <!-- Main Content -->
        <div class="content">
          <!-- Left Column -->
          <main class="main-col">
            <!-- Rankings -->
            @if (dashboardStats?.leaderboardRankings?.length) {
              <section class="card">
                <header class="card-header">
                  <h2>Your Rankings</h2>
                  <a routerLink="/leaderboards" class="link">View all</a>
                </header>
                <div class="rankings">
                  @for (r of dashboardStats!.leaderboardRankings; track r.leaderboardId) {
                    <a [routerLink]="['/leaderboards', r.game.toLowerCase(), r.platform.toLowerCase()]" class="rank-row">
                      <span class="rank" [class.gold]="r.rankedOptIn && r.rank === 1" [class.silver]="r.rankedOptIn && r.rank === 2" [class.bronze]="r.rankedOptIn && r.rank === 3">
                        @if (r.rankedOptIn && r.rank != null) {
                          #{{ r.rank }}
                        } @else if (r.xpOptIn) {
                          Elo {{ r.elo ?? '—' }}
                        } @else {
                          —
                        }
                      </span>
                      <span class="game">{{ r.game }}</span>
                      <span class="platform">{{ r.platform }}</span>
                      <span class="record">{{ r.wins }}W {{ r.losses }}L</span>
                    </a>
                  }
                </div>
              </section>
            }

            <!-- My Recent Matches -->
            @if (stats?.recentMatches?.length) {
              <section class="card">
                <header class="card-header">
                  <h2>My Matches</h2>
                  <a routerLink="/challenges" class="link">View all</a>
                </header>
                <div class="matches">
                  @for (m of stats!.recentMatches!.slice(0, 5); track m.id) {
                    <div class="match-row" [class.win]="m.isWinner" [class.loss]="!m.isWinner && m.winnerId">
                      <span class="result-icon">
                        @if (m.isWinner) { W } @else if (m.winnerId) { L } @else { - }
                      </span>
                      <span class="opponent">{{ m.opponent.username }}</span>
                      <span class="game">{{ m.game }}</span>
                      <span class="type-tag" [class.ranked]="m.type === 'RANKED'">{{ m.type }}</span>
                    </div>
                  }
                </div>
              </section>
            }

            <!-- Pending Challenges -->
            @if (pendingChallenges.length > 0) {
              <section class="card">
                <header class="card-header">
                  <h2>Pending Challenges</h2>
                  <span class="badge">{{ pendingChallenges.length }}</span>
                </header>
                <div class="challenges">
                  @for (c of pendingChallenges; track c.id) {
                    <a [routerLink]="['/challenges', c.id]" class="challenge-row">
                      <span class="challenger">{{ getOpponent(c)?.username }}</span>
                      <span class="details">{{ c.leaderboard.game.name }} · Bo{{ c.bestOf }}</span>
                      <span class="type-tag" [class.ranked]="c.type === 'RANKED'">{{ c.type }}</span>
                      <mat-icon>chevron_right</mat-icon>
                    </a>
                  }
                </div>
              </section>
            }
          </main>

          <!-- Right Column -->
          <aside class="side-col">
            <!-- Recent Wins Feed -->
            @if (recentWins.length > 0) {
              <section class="card">
                <header class="card-header">
                  <h2>Live Activity</h2>
                  <span class="live-tag">LIVE</span>
                </header>
                <div class="activity-feed">
                  @for (w of recentWins; track w.matchId) {
                    <div class="activity-item">
                      <div class="activity-avatar winner-avatar">
                        {{ getInitial(w.winner.username) }}
                      </div>
                      <span class="winner">{{ w.winner.username }}</span>
                      <span class="action">beat</span>
                      <div class="activity-avatar loser-avatar">
                        {{ getInitial(w.loser.username) }}
                      </div>
                      <span class="loser">{{ w.loser.username }}</span>
                      <span class="game-tag">{{ w.game }}</span>
                    </div>
                  }
                </div>
              </section>
            }

          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 100px 0;
    }

    /* Profile Header */
    .profile-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 32px;
      padding: 28px;
      margin-bottom: 24px;
      background: linear-gradient(135deg, rgba(var(--theme-primary-rgb), 0.08) 0%, rgba(255,255,255,0.02) 100%);
      border: 1px solid rgba(var(--theme-primary-rgb), 0.15);
      border-radius: 20px;
    }

    /* Plutonium Username Row */
    .pluto-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 20px;
      margin-bottom: 24px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .pluto-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.5);
      white-space: nowrap;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .pluto-edit {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      max-width: 350px;
    }

    .pluto-input {
      flex: 1;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;

      &::placeholder {
        color: rgba(255, 255, 255, 0.25);
      }

      &:focus {
        border-color: rgba(var(--theme-primary-rgb), 0.4);
      }
    }

    .pluto-save {
      padding: 7px 14px;
      background: var(--theme-primary);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      transition: filter 0.15s;
      display: flex;
      align-items: center;

      &:hover:not(:disabled) {
        filter: brightness(1.15);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .profile-info {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .avatar {
      position: relative;
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-primary-dark));
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      color: white;
      box-shadow: 0 8px 24px rgba(var(--theme-primary-rgb), 0.3);

      img {
        width: 100%;
        height: 100%;
        border-radius: 20px;
        object-fit: cover;
      }
    }

    .level-badge {
      position: absolute;
      bottom: -4px;
      right: -4px;
      min-width: 22px;
      height: 22px;
      padding: 0 5px;
      background: linear-gradient(135deg, #22d3ee, #06b6d4);
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #1a1a2e;
    }

    .profile-text h1 {
      margin: 0 0 10px;
      font-size: 28px;
      font-weight: 700;
      color: white;
    }

    .username-display {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 10px;

      .edit-icon {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.15);
        transition: color 0.15s;
      }

      &:hover .edit-icon {
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .username-edit {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .username-input {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: white;
      font-size: 18px;
      font-weight: 600;
      font-family: inherit;
      width: 200px;

      &:focus {
        outline: none;
        border-color: rgba(37, 99, 235, 0.5);
      }
    }

    .username-save {
      padding: 8px 16px;
      background: #2563eb;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;

      &:disabled { opacity: 0.4; cursor: default; }
      &:hover:not(:disabled) { background: #1d4ed8; }
    }

    .username-cancel {
      padding: 8px 12px;
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;

      &:hover { color: white; border-color: rgba(255, 255, 255, 0.2); }
    }

    .xp-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .xp-label {
      font-size: 13px;
      font-weight: 700;
      color: #22d3ee;
    }

    .xp-track {
      width: 120px;
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .xp-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #22d3ee);
      border-radius: 4px;
      transition: width 0.3s;
    }

    .xp-amount {
      font-size: 12px;
      color: rgba(255,255,255,0.5);
    }

    .stats-grid {
      display: flex;
      gap: 32px;
    }

    .stat-box {
      text-align: center;
      min-width: 70px;
    }

    .stat-num {
      display: block;
      font-size: 28px;
      font-weight: 700;
      color: white;
    }

    .stat-name {
      font-size: 11px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Content Layout */
    .content {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 24px;
    }

    .main-col, .side-col {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Cards */
    .card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 16px;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);

      h2 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: white;
      }

      .link {
        font-size: 12px;
        color: var(--theme-primary-bright);
        text-decoration: none;

        &:hover { text-decoration: underline; }
      }

      .badge {
        padding: 2px 8px;
        background: var(--theme-primary);
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        color: white;
      }

      .live-tag {
        padding: 2px 8px;
        background: rgba(34,197,94,0.15);
        border-radius: 6px;
        font-size: 10px;
        font-weight: 700;
        color: #22c55e;
        letter-spacing: 0.5px;
      }
    }

    /* Rankings */
    .rankings {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .rank-row {
      display: grid;
      /* First column must fit "Elo 1000" on one line (was 48px and wrapped) */
      grid-template-columns: minmax(96px, max-content) 1fr auto auto;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      text-decoration: none;
      transition: background 0.15s;

      &:hover { background: rgba(255,255,255,0.04); }
    }

    .rank {
      font-size: 14px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
      white-space: nowrap;
      line-height: 1.2;

      &.gold { color: #fbbf24; }
      &.silver { color: #94a3b8; }
      &.bronze { color: #cd7c32; }
    }

    .game {
      font-size: 13px;
      font-weight: 500;
      color: white;
    }

    .platform {
      font-size: 12px;
      color: rgba(255,255,255,0.4);
    }

    .record {
      font-size: 12px;
      font-weight: 500;
      color: rgba(255,255,255,0.5);
    }

    /* Matches */
    .matches {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .match-row {
      display: grid;
      grid-template-columns: 32px 1fr auto auto;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 8px;
    }

    .result-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.4);
    }

    .match-row.win .result-icon {
      background: rgba(34,197,94,0.15);
      color: #22c55e;
    }

    .match-row.loss .result-icon {
      background: rgba(239,68,68,0.15);
      color: #ef4444;
    }

    .opponent {
      font-size: 13px;
      font-weight: 500;
      color: white;
    }

    .type-tag {
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.5);

      &.ranked {
        background: rgba(var(--theme-primary-rgb),0.15);
        color: var(--theme-primary-bright);
      }
    }

    /* Challenges */
    .challenges {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .challenge-row {
      display: grid;
      grid-template-columns: 1fr auto auto 20px;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      text-decoration: none;
      transition: background 0.15s;

      &:hover { background: rgba(255,255,255,0.04); }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: rgba(255,255,255,0.3);
      }
    }

    .challenger {
      font-size: 13px;
      font-weight: 500;
      color: white;
    }

    .details {
      font-size: 12px;
      color: rgba(255,255,255,0.4);
    }

    /* Activity Feed */
    .activity-feed {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      font-size: 12px;

      &:last-child { border-bottom: none; }
    }

    .activity-avatar {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: white;
      flex-shrink: 0;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      &.winner-avatar {
        background: linear-gradient(135deg, #22c55e, #16a34a);
      }

      &.loser-avatar {
        background: rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.5);
      }
    }

    .winner {
      font-weight: 600;
      color: #22c55e;
    }

    .action {
      color: rgba(255,255,255,0.4);
    }

    .loser {
      font-weight: 500;
      color: white;
    }

    .game-tag {
      margin-left: auto;
      font-size: 10px;
      color: rgba(255,255,255,0.3);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dashboard { padding: 16px; }

      .profile-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
        padding: 20px;
      }

      .stats-grid {
        width: 100%;
        justify-content: space-around;
      }

      .content {
        grid-template-columns: 1fr;
      }

      .side-col {
        order: -1;
      }

      .rank-row {
        grid-template-columns: minmax(80px, max-content) 1fr auto;
      }

      .platform { display: none; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  user: any;
  stats: UserStats | null = null;
  dashboardStats: DashboardStats | null = null;
  recentWins: GlobalRecentWin[] = [];
  pendingChallenges: Match[] = [];
  loading = true;
  plutoniumUsername = '';
  savingPluto = false;
  editingUsername = false;
  newUsername = '';
  savingUsername = false;

  private dataLoaded = false;

  constructor(
    public authService: AuthService,
    private usersService: UsersService,
    private challengesService: ChallengesService,
    private snackBar: MatSnackBar,
  ) {
    effect(() => {
      const user = this.authService.currentUser();
      if (user && !this.dataLoaded) {
        this.user = user;
        this.plutoniumUsername = user.plutoniumUsername || '';
        this.dataLoaded = true;
        this.loadDashboardData();
      }
    });
  }

  ngOnInit(): void {}

  private loadDashboardData(): void {
    forkJoin({
      stats: this.usersService.getUserStats(this.user.id),
      dashboardStats: this.usersService.getDashboardStats(this.user.id),
      recentWins: this.usersService.getGlobalRecentWins(8),
      challenges: this.challengesService.getMyChallenges('PENDING'),
    }).subscribe({
      next: ({ stats, dashboardStats, recentWins, challenges }) => {
        this.stats = stats;
        this.dashboardStats = dashboardStats;
        this.recentWins = recentWins;
        this.pendingChallenges = challenges;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getXpProgress(): number {
    if (!this.dashboardStats) return 0;
    const level = this.dashboardStats.level;
    const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpIntoLevel = this.dashboardStats.totalXp - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
    return Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100);
  }

  getInitial(username: string | undefined): string {
    return username?.charAt(0).toUpperCase() || '?';
  }

  getOpponent(match: Match): { id: string; username: string } | null {
    if (!this.user) return null;
    if (match.challengerId === this.user.id) {
      return match.challengee ?? null;
    }
    return match.challenger;
  }

  startEditUsername(): void {
    this.editingUsername = true;
    this.newUsername = this.user?.username || '';
  }

  cancelEditUsername(): void {
    this.editingUsername = false;
    this.newUsername = '';
  }

  saveUsername(): void {
    const username = this.newUsername.trim();
    if (!username || this.savingUsername) return;
    if (username === this.user?.username) {
      this.cancelEditUsername();
      return;
    }
    this.savingUsername = true;
    this.authService.setUsername(username).subscribe({
      next: (result) => {
        this.user = { ...this.user, username: result.user.username };
        this.authService.currentUser.set(this.user);
        this.snackBar.open('Username updated', 'Close', { duration: 3000 });
        this.savingUsername = false;
        this.editingUsername = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to update username', 'Close', { duration: 3000 });
        this.savingUsername = false;
      },
    });
  }

  savePlutoniumUsername(): void {
    if (this.savingPluto) return;
    this.savingPluto = true;
    this.usersService.updateProfile({ plutoniumUsername: this.plutoniumUsername }).subscribe({
      next: (updated) => {
        this.user = { ...this.user, plutoniumUsername: updated.plutoniumUsername };
        this.authService.currentUser.set(this.user);
        this.snackBar.open('Plutonium username saved', 'Close', { duration: 3000 });
        this.savingPluto = false;
      },
      error: () => {
        this.snackBar.open('Failed to save', 'Close', { duration: 3000 });
        this.savingPluto = false;
      }
    });
  }
}
