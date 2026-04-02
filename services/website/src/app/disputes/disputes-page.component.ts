import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChallengesService, Match } from '../challenges/challenges.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-disputes-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="disputes-page">
      <h1>Dispute moderation</h1>
      <p class="subtitle">
        @if (authService.currentUser()?.role === 'admin') {
          You see initial disputes and escalations after a ref decision is disputed.
        } @else {
          You see disputes awaiting a ref. Escalations are admin-only.
        }
      </p>

      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (matches.length === 0) {
        <mat-card class="empty">
          <mat-icon>gavel</mat-icon>
          <p>No disputes in queue.</p>
        </mat-card>
      } @else {
        @for (m of matches; track m.id) {
          <mat-card class="dispute-card">
            <mat-card-header>
              <mat-card-title>
                {{ m.challenger.username }} vs {{ m.challengee?.username ?? '—' }}
              </mat-card-title>
              <mat-card-subtitle>
                {{ m.leaderboard.game.name }} — {{ m.leaderboard.platform.name }} · {{ m.type }}
                · {{ m.disputePhase }}
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <mat-radio-group [(ngModel)]="selectedWinner[m.id]" class="winner-pick">
                <mat-radio-button [value]="m.challengerId">{{ m.challenger.username }} wins</mat-radio-button>
                <mat-radio-button [value]="m.challengeeId">{{ m.challengee?.username ?? 'Challengee' }} wins</mat-radio-button>
              </mat-radio-group>
            </mat-card-content>
            <mat-card-actions>
              <button
                mat-raised-button
                color="primary"
                (click)="submitModeration(m)"
                [disabled]="!selectedWinner[m.id] || submittingId === m.id">
                @if (submittingId === m.id) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Submit decision
                }
              </button>
            </mat-card-actions>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .disputes-page {
      max-width: 720px;
      margin: 0 auto;
      padding: 24px;
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .subtitle {
      color: rgba(255,255,255,0.6);
      margin-bottom: 24px;
      font-size: 14px;
      line-height: 1.5;
    }
    .loading, .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: rgba(255,255,255,0.5);
    }
    .empty mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.4;
    }
    .dispute-card {
      margin-bottom: 16px;
    }
    .winner-pick {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    mat-card-actions {
      padding: 16px;
    }
  `],
})
export class DisputesPageComponent implements OnInit {
  matches: Match[] = [];
  loading = true;
  selectedWinner: Record<string, string> = {};
  submittingId: string | null = null;

  constructor(
    private challengesService: ChallengesService,
    private snackBar: MatSnackBar,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadQueue();
  }

  loadQueue(): void {
    this.loading = true;
    this.challengesService.getModerationQueue().subscribe({
      next: (list) => {
        this.matches = list;
        this.selectedWinner = {};
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load disputes', 'Close', { duration: 3000 });
        this.loading = false;
      },
    });
  }

  submitModeration(m: Match): void {
    const winnerId = this.selectedWinner[m.id];
    if (!winnerId) return;
    this.submittingId = m.id;
    this.challengesService.moderateMatch(m.id, winnerId).subscribe({
      next: () => {
        this.submittingId = null;
        this.snackBar.open('Decision recorded.', 'Close', { duration: 3000 });
        this.loadQueue();
      },
      error: (err) => {
        this.submittingId = null;
        this.snackBar.open(err.error?.message || 'Failed to submit', 'Close', { duration: 4000 });
      },
    });
  }
}
