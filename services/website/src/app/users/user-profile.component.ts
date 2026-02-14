import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { UsersService, UserProfile, UserStats, RecentMatch } from './users.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
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
export class UserProfileComponent implements OnInit {
  user: UserProfile | null = null;
  stats: UserStats | null = null;
  loading = true;

  constructor(
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUserProfile(userId);
    } else {
      this.loading = false;
    }
  }

  private loadUserProfile(userId: string): void {
    forkJoin({
      user: this.usersService.getUserById(userId),
      stats: this.usersService.getUserStats(userId)
    }).subscribe({
      next: (result) => {
        console.log('User data:', result.user);
        this.user = result.user;
        this.stats = result.stats;
        this.loading = false;
      },
      error: () => {
        this.user = null;
        this.loading = false;
      }
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
