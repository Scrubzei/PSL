import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChallengesService, Match } from './challenges.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-challenge-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ClipboardModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="challenge-detail-container">
      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading challenge...</p>
        </div>
      } @else if (match) {
        <div class="header-actions">
          <button mat-button class="back-button" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon> Back to Challenges
          </button>
          @if (match.shareToken) {
            <button mat-stroked-button class="share-button" (click)="copyShareLink()">
              <mat-icon>share</mat-icon> Copy Share Link
            </button>
          }
        </div>

        <mat-card class="match-card">
          <mat-card-header>
            <mat-card-title class="match-title">
              {{ match.challenger.username }} vs {{ match.challengee.username }}
            </mat-card-title>
            <mat-card-subtitle>
              {{ match.leaderboard.game.name }} - {{ match.leaderboard.platform.name }}
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="match-info">
              <div class="badges">
                <span class="badge type" [class]="match.type.toLowerCase()">{{ match.type }}</span>
                <span class="badge status" [class]="match.status.toLowerCase()">{{ match.status }}</span>
                <span class="badge best-of">Best of {{ match.bestOf }}</span>
              </div>
            </div>

            <!-- Dispute Warning -->
            @if (match.status === 'DISPUTED') {
              <div class="dispute-warning">
                <mat-icon>warning</mat-icon>
                <div class="dispute-text">
                  <strong>This match is disputed!</strong>
                  <p>Both players reported different winners. You can either update your report or concede to accept your opponent's result.</p>
                </div>
              </div>
            }

            <!-- Reporting Status -->
            @if (match.status === 'ACCEPTED' || match.status === 'DISPUTED') {
              <div class="reporting-status">
                <div class="reporter" [class.reported]="match.challengerReportedWinnerId">
                  <mat-icon>{{ match.challengerReportedWinnerId ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                  <span class="reporter-name">{{ match.challenger.username }}</span>
                  <span class="status-text">
                    @if (match.challengerReportedWinnerId) {
                      reported <strong>{{ getReportedWinnerName(match.challengerReportedWinnerId) }}</strong> as winner
                    } @else {
                      hasn't reported yet
                    }
                  </span>
                </div>
                <div class="reporter" [class.reported]="match.challengeeReportedWinnerId">
                  <mat-icon>{{ match.challengeeReportedWinnerId ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                  <span class="reporter-name">{{ match.challengee.username }}</span>
                  <span class="status-text">
                    @if (match.challengeeReportedWinnerId) {
                      reported <strong>{{ getReportedWinnerName(match.challengeeReportedWinnerId) }}</strong> as winner
                    } @else {
                      hasn't reported yet
                    }
                  </span>
                </div>
              </div>
            }

            <!-- Score Display -->
            @if (canReport || match.status === 'COMPLETED') {
              <div class="score-display">
                <span class="player-score" [class.winner]="challengerWins > challengeeWins">
                  {{ match.challenger.username }}
                </span>
                <span class="score">
                  <span [class.winning]="challengerWins > challengeeWins">{{ challengerWins }}</span>
                  <span class="separator">-</span>
                  <span [class.winning]="challengeeWins > challengerWins">{{ challengeeWins }}</span>
                </span>
                <span class="player-score" [class.winner]="challengeeWins > challengerWins">
                  {{ match.challengee.username }}
                </span>
              </div>
            }

            <!-- Map Results Section -->
            @if (canReport) {
              <div class="map-results-section">
                <h3>Map Results</h3>
                @for (map of match.selectedMaps; track $index; let i = $index) {
                  <div class="map-result-row">
                    <div class="map-info">
                      <span class="map-number">Map {{ i + 1 }}</span>
                      <span class="map-name">{{ map }}</span>
                    </div>
                    <mat-radio-group
                      [(ngModel)]="mapResults[i]"
                      (change)="onMapResultChange()"
                      class="map-winner-select">
                      <mat-radio-button value="challenger">
                        {{ match.challenger.username }}
                      </mat-radio-button>
                      <mat-radio-button value="challengee">
                        {{ match.challengee.username }}
                      </mat-radio-button>
                    </mat-radio-group>
                  </div>
                }
              </div>

              <!-- Calculated Winner -->
              @if (calculatedWinner) {
                <mat-divider></mat-divider>
                <div class="calculated-winner">
                  <mat-icon>emoji_events</mat-icon>
                  <span>Winner: <strong>{{ calculatedWinner }}</strong></span>
                </div>
              }
            }

            <!-- Completed Match Winner -->
            @if (match.status === 'COMPLETED' && match.winnerId) {
              <mat-divider></mat-divider>
              <div class="match-winner">
                <mat-icon>emoji_events</mat-icon>
                <span>Winner: <strong>{{ getReportedWinnerName(match.winnerId) }}</strong></span>
              </div>
            }
          </mat-card-content>

          <!-- Actions -->
          @if (canReport) {
            <mat-card-actions>
              <button
                mat-raised-button
                color="primary"
                (click)="submitResult()"
                [disabled]="!calculatedWinnerId || submitting">
                @if (submitting) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>save</mat-icon>
                  {{ hasAlreadyReported ? 'Update Results' : 'Submit Results' }}
                }
              </button>

              <button mat-button (click)="resetResults()">
                <mat-icon>refresh</mat-icon>
                Reset
              </button>

              @if (match.status === 'DISPUTED') {
                <button
                  mat-raised-button
                  color="warn"
                  (click)="concede()"
                  [disabled]="submitting">
                  <mat-icon>flag</mat-icon>
                  Concede to Opponent
                </button>
              }

              @if (hasAlreadyReported && match.status !== 'DISPUTED') {
                <span class="waiting-message">
                  <mat-icon>info</mat-icon>
                  Waiting for opponent to report...
                </span>
              }
            </mat-card-actions>
          }
        </mat-card>
      } @else {
        <div class="not-found">
          <mat-icon>error_outline</mat-icon>
          <h2>Challenge not found</h2>
          <button mat-raised-button color="primary" (click)="goBack()">Go Back</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .challenge-detail-container {
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }

    .loading, .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px;
      color: rgba(255, 255, 255, 0.5);

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.3;
        margin-bottom: 16px;
      }

      p, h2 {
        margin: 16px 0;
        color: rgba(255, 255, 255, 0.7);
      }
    }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .back-button {
      color: rgba(255, 255, 255, 0.7);
    }

    .share-button {
      color: #90caf9;
      border-color: rgba(144, 202, 249, 0.5);
    }

    .match-card {
      mat-card-header {
        margin-bottom: 16px;
      }

      mat-card-title {
        color: white !important;
      }

      mat-card-subtitle {
        color: rgba(255, 255, 255, 0.6) !important;
      }
    }

    .match-title {
      font-size: 24px !important;
    }

    .match-info {
      margin-bottom: 16px;
    }

    .badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge.type.ranked {
      background: rgba(255, 152, 0, 0.2);
      color: #ffb74d;
    }

    .badge.type.xp {
      background: rgba(76, 175, 80, 0.2);
      color: #81c784;
    }

    .badge.status.pending {
      background: rgba(255, 152, 0, 0.2);
      color: #ffb74d;
    }

    .badge.status.accepted {
      background: rgba(129, 199, 132, 0.15);
      color: #81c784;
    }

    .badge.status.declined {
      background: rgba(229, 115, 115, 0.15);
      color: #e57373;
    }

    .badge.status.completed {
      background: rgba(100, 181, 246, 0.15);
      color: var(--theme-primary-bright, #64b5f6);
    }

    .badge.status.disputed {
      background: rgba(229, 115, 115, 0.15);
      color: #e57373;
    }

    .badge.best-of {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.7);
    }

    .score-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin: 16px 0;
      border: 1px solid #2d2d2d;

      .player-score {
        font-size: 16px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.8);

        &.winner {
          color: #4caf50;
          font-weight: 600;
        }
      }

      .score {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 32px;
        font-weight: 700;
        color: white;

        .separator {
          color: rgba(255, 255, 255, 0.4);
        }

        .winning {
          color: #4caf50;
        }
      }
    }

    .map-results-section {
      margin: 24px 0;

      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 500;
        color: white;
      }
    }

    .map-result-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid #2d2d2d;

      .map-info {
        display: flex;
        align-items: center;
        gap: 16px;

        .map-number {
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
          min-width: 50px;
        }

        .map-name {
          font-weight: 500;
          font-size: 15px;
          color: white;
        }
      }

      .map-winner-select {
        display: flex;
        gap: 24px;
      }
    }

    .calculated-winner, .match-winner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 24px;
      font-size: 20px;
      color: white;

      mat-icon {
        color: #ffc107;
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
    }

    .dispute-warning {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      background: rgba(244, 67, 54, 0.1);
      border-radius: 8px;
      margin: 16px 0;
      border-left: 4px solid #f44336;

      mat-icon {
        color: #f44336;
        font-size: 28px;
        width: 28px;
        height: 28px;
        flex-shrink: 0;
      }

      .dispute-text {
        strong {
          color: #e57373;
          font-size: 16px;
        }

        p {
          margin: 4px 0 0 0;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }
      }
    }

    .reporting-status {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      margin: 16px 0;
    }

    .reporter {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);

      mat-icon {
        color: rgba(255, 255, 255, 0.3);
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      .reporter-name {
        font-weight: 600;
        min-width: 100px;
        color: white;
      }

      .status-text {
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
      }

      &.reported {
        border-color: #4caf50;
        background: rgba(76, 175, 80, 0.1);

        mat-icon {
          color: #4caf50;
        }
      }
    }

    .report-section {
      padding: 24px 0;

      h3 {
        margin: 0 0 8px 0;
        color: white;
      }

      .report-instructions {
        margin: 0 0 16px 0;
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
      }
    }

    .winner-select {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .winner-option {
      .winner-option-content {
        display: flex;
        align-items: center;
        gap: 8px;

        .player-name {
          font-weight: 500;
          font-size: 16px;
          color: white;
        }

        .you-tag {
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
        }
      }
    }

    mat-card-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      flex-wrap: wrap;

      .waiting-message {
        display: flex;
        align-items: center;
        gap: 4px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 13px;
        margin-left: auto;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }
  `]
})
export class ChallengeDetailComponent implements OnInit {
  match: Match | null = null;
  mapResults: ('challenger' | 'challengee' | null)[] = [];
  loading = true;
  submitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private challengesService: ChallengesService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private clipboard: Clipboard
  ) {}

  get currentUserId(): string | null {
    return this.authService.currentUser()?.id ?? null;
  }

  get isChallenger(): boolean {
    return this.match?.challengerId === this.currentUserId;
  }

  get canReport(): boolean {
    if (!this.match) return false;
    return (
      (this.match.status === 'ACCEPTED' || this.match.status === 'DISPUTED') &&
      (this.match.challengerId === this.currentUserId ||
       this.match.challengeeId === this.currentUserId)
    );
  }

  get hasAlreadyReported(): boolean {
    if (!this.match) return false;
    if (this.isChallenger) {
      return !!this.match.challengerReportedWinnerId;
    }
    return !!this.match.challengeeReportedWinnerId;
  }

  get challengerWins(): number {
    return this.mapResults.filter(r => r === 'challenger').length;
  }

  get challengeeWins(): number {
    return this.mapResults.filter(r => r === 'challengee').length;
  }

  get calculatedWinner(): string | null {
    if (!this.match) return null;
    const winsNeeded = Math.ceil(this.match.bestOf / 2);
    if (this.challengerWins >= winsNeeded) {
      return this.match.challenger.username;
    }
    if (this.challengeeWins >= winsNeeded) {
      return this.match.challengee.username;
    }
    return null;
  }

  get calculatedWinnerId(): string | null {
    if (!this.match) return null;
    const winsNeeded = Math.ceil(this.match.bestOf / 2);
    if (this.challengerWins >= winsNeeded) {
      return this.match.challengerId;
    }
    if (this.challengeeWins >= winsNeeded) {
      return this.match.challengeeId;
    }
    return null;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMatch(id);
    } else {
      this.loading = false;
    }
  }

  loadMatch(id: string): void {
    this.loading = true;
    this.challengesService.getChallenge(id).subscribe({
      next: (match) => {
        this.match = match;
        // Initialize map results array
        this.mapResults = new Array(match.selectedMaps.length).fill(null);

        // Pre-populate map results if user already reported
        const myMapResults = this.isChallenger
          ? match.challengerReportedMapResults
          : match.challengeeReportedMapResults;

        if (myMapResults && myMapResults.length > 0) {
          myMapResults.forEach((result, index) => {
            if (index < this.mapResults.length) {
              this.mapResults[index] = result.winner;
            }
          });
        }

        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load challenge', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  getReportedWinnerName(winnerId: string): string {
    if (!this.match) return '';
    if (winnerId === this.match.challengerId) {
      return this.match.challenger.username;
    }
    return this.match.challengee.username;
  }

  onMapResultChange(): void {
    // This method is called when any map result changes
    // The computed properties will automatically update
  }

  resetResults(): void {
    if (this.match) {
      this.mapResults = new Array(this.match.selectedMaps.length).fill(null);
    }
  }

  submitResult(): void {
    if (!this.calculatedWinnerId || !this.match) return;

    this.submitting = true;

    this.challengesService.reportResult(this.match.id, this.calculatedWinnerId).subscribe({
      next: (updatedMatch) => {
        this.match = updatedMatch;
        this.submitting = false;

        if (updatedMatch.status === 'COMPLETED') {
          this.snackBar.open('Match completed! Results have been recorded.', 'Close', { duration: 3000 });
        } else if (updatedMatch.status === 'DISPUTED') {
          this.snackBar.open('Results don\'t match. Match is now disputed.', 'Close', { duration: 5000 });
        } else {
          this.snackBar.open('Result submitted! Waiting for opponent.', 'Close', { duration: 3000 });
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to submit result', 'Close', { duration: 3000 });
        this.submitting = false;
      }
    });
  }

  concede(): void {
    if (!this.match) return;

    this.submitting = true;

    this.challengesService.concedeDispute(this.match.id).subscribe({
      next: (updatedMatch) => {
        this.match = updatedMatch;
        this.submitting = false;
        this.snackBar.open('You conceded. Match has been resolved.', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to concede', 'Close', { duration: 3000 });
        this.submitting = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/challenges']);
  }

  copyShareLink(): void {
    if (!this.match?.shareToken) return;

    const shareUrl = `${window.location.origin}/match/${this.match.shareToken}`;
    this.clipboard.copy(shareUrl);
    this.snackBar.open('Share link copied to clipboard!', 'Close', { duration: 3000 });
  }
}
