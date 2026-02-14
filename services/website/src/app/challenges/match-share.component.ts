import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChallengesService, Match } from './challenges.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-match-share',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="share-page">
      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Loading match...</p>
        </div>
      } @else if (error) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <h2>Match not found</h2>
          <p>This match link may have expired or is invalid.</p>
          <button mat-raised-button color="primary" routerLink="/leaderboards">Go to Leaderboards</button>
        </div>
      } @else if (match) {
        <mat-card class="match-preview">
          <mat-card-header>
            <div class="game-badge">
              {{ match.leaderboard.game.name }}
            </div>
          </mat-card-header>

          <mat-card-content>
            <div class="match-title">
              <span class="player">{{ match.challenger.username || 'Player 1' }}</span>
              <span class="vs">VS</span>
              <span class="player">{{ match.challengee.username || 'Player 2' }}</span>
            </div>

            <div class="match-details">
              <div class="detail">
                <mat-icon>sports_esports</mat-icon>
                <span>{{ match.leaderboard.platform.name }}</span>
              </div>
              <div class="detail">
                <mat-icon>emoji_events</mat-icon>
                <span>Best of {{ match.bestOf }}</span>
              </div>
              <div class="detail">
                <mat-icon>{{ match.type === 'RANKED' ? 'trending_up' : 'star' }}</mat-icon>
                <span>{{ match.type }} Match</span>
              </div>
            </div>

            <div class="status-badge" [class]="match.status.toLowerCase()">
              {{ match.status }}
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="loginToAccept()">
              <mat-icon>login</mat-icon>
              Sign In with Discord
            </button>
          </mat-card-actions>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .share-page {
      min-height: 100dvh;
      background: #121212;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: rgba(255, 255, 255, 0.7);

      p {
        margin-top: 16px;
      }
    }

    .error-state {
      text-align: center;
      color: rgba(255, 255, 255, 0.7);

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.5;
      }

      h2 {
        margin: 16px 0 8px;
        color: white;
      }

      p {
        margin-bottom: 24px;
      }
    }

    .match-preview {
      max-width: 450px;
      width: 100%;

      mat-card-header {
        display: flex;
        justify-content: center;
        margin-bottom: 16px;
      }
    }

    .game-badge {
      background: rgba(144, 202, 249, 0.15);
      color: #90caf9;
      padding: 8px 24px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
    }

    .match-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 24px;

      .player {
        font-size: 20px;
        font-weight: 600;
        color: white;
      }

      .vs {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.4);
        padding: 4px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
      }
    }

    .match-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;

      .detail {
        display: flex;
        align-items: center;
        gap: 12px;
        color: rgba(255, 255, 255, 0.7);

        mat-icon {
          color: rgba(255, 255, 255, 0.5);
        }
      }
    }

    .status-badge {
      text-align: center;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 13px;

      &.pending {
        background: rgba(255, 152, 0, 0.15);
        color: #ffb74d;
      }

      &.accepted {
        background: rgba(76, 175, 80, 0.15);
        color: #81c784;
      }

      &.completed {
        background: rgba(100, 181, 246, 0.15);
        color: var(--theme-primary-bright, #64b5f6);
      }

      &.declined, &.cancelled, &.disputed {
        background: rgba(229, 115, 115, 0.15);
        color: #e57373;
      }
    }

    mat-card-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;

      button {
        width: 100%;
      }
    }
  `]
})
export class MatchShareComponent implements OnInit {
  match: Match | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private challengesService: ChallengesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.error = true;
      this.loading = false;
      return;
    }

    // If user is already authenticated, redirect to the match detail
    if (this.authService.isAuthenticated()) {
      this.loadMatchAndRedirect(token);
    } else {
      this.loadMatchPreview(token);
    }
  }

  private loadMatchAndRedirect(token: string): void {
    this.challengesService.getMatchByShareToken(token).subscribe({
      next: (match) => {
        // Redirect to the actual match page
        this.router.navigate(['/challenges', match.id]);
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  private loadMatchPreview(token: string): void {
    this.challengesService.getMatchByShareToken(token).subscribe({
      next: (match) => {
        this.match = match;
        this.loading = false;
        // Store the redirect URL for after login
        localStorage.setItem('pendingMatchRedirect', `/challenges/${match.id}`);
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  loginToAccept(): void {
    this.authService.initiateDiscordLogin();
  }
}
