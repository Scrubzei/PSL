import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChallengesService, Match } from './challenges.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-challenges',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="challenges-container">
      <h1>My Challenges</h1>

      <mat-tab-group [selectedIndex]="currentTab" (selectedIndexChange)="onTabChange($event)">
        <mat-tab label="Incoming">
          <div class="challenges-list">
            @if (incomingChallenges.length === 0) {
              <div class="empty-state">
                <mat-icon>inbox</mat-icon>
                <p>No incoming challenges</p>
              </div>
            } @else {
              @for (challenge of incomingChallenges; track challenge.id) {
                <mat-card class="challenge-card" [class.highlighted]="challenge.id === highlightedChallengeId">
                  <mat-card-header>
                    <mat-card-title>{{ challenge.challenger.username }}</mat-card-title>
                    <mat-card-subtitle>challenged you</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="badges">
                      <span class="badge game">{{ challenge.leaderboard.game.name }}</span>
                      <span class="badge platform">{{ challenge.leaderboard.platform.name }}</span>
                      <span class="badge type" [class]="challenge.type.toLowerCase()">{{ challenge.type }}</span>
                      <span class="badge status" [class]="challenge.status.toLowerCase()">{{ challenge.status }}</span>
                    </div>
                    <div class="details">
                      <p><strong>Best of:</strong> {{ challenge.bestOf }}</p>
                      <p><strong>Maps:</strong> {{ challenge.selectedMaps?.join(', ') }}</p>
                      <p class="time">{{ getTimeAgo(challenge.createdAt) }}</p>
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    @if (challenge.status === 'PENDING') {
                      <button mat-raised-button color="primary" (click)="acceptChallenge(challenge); $event.stopPropagation()">
                        <mat-icon>check</mat-icon> Accept
                      </button>
                      <button mat-raised-button color="warn" (click)="declineChallenge(challenge); $event.stopPropagation()">
                        <mat-icon>close</mat-icon> Decline
                      </button>
                    }
                    @if (challenge.status === 'ACCEPTED') {
                      <button mat-button color="primary" (click)="viewChallenge(challenge)">
                        <mat-icon>visibility</mat-icon> View Details
                      </button>
                    }
                  </mat-card-actions>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

        <mat-tab label="Outgoing">
          <div class="challenges-list">
            @if (outgoingChallenges.length === 0) {
              <div class="empty-state">
                <mat-icon>send</mat-icon>
                <p>No outgoing challenges</p>
              </div>
            } @else {
              @for (challenge of outgoingChallenges; track challenge.id) {
                <mat-card class="challenge-card" [class.highlighted]="challenge.id === highlightedChallengeId">
                  <mat-card-header>
                    <mat-card-title>{{ challenge.challengee.username }}</mat-card-title>
                    <mat-card-subtitle>you challenged</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="badges">
                      <span class="badge game">{{ challenge.leaderboard.game.name }}</span>
                      <span class="badge platform">{{ challenge.leaderboard.platform.name }}</span>
                      <span class="badge type" [class]="challenge.type.toLowerCase()">{{ challenge.type }}</span>
                      <span class="badge status" [class]="challenge.status.toLowerCase()">{{ challenge.status }}</span>
                    </div>
                    <div class="details">
                      <p><strong>Best of:</strong> {{ challenge.bestOf }}</p>
                      <p><strong>Maps:</strong> {{ challenge.selectedMaps?.join(', ') }}</p>
                      <p class="time">{{ getTimeAgo(challenge.createdAt) }}</p>
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    @if (challenge.status === 'PENDING') {
                      <button mat-button color="warn" (click)="cancelChallenge(challenge)">
                        <mat-icon>cancel</mat-icon> Cancel
                      </button>
                    }
                    @if (challenge.status === 'ACCEPTED') {
                      <button mat-button color="primary" (click)="viewChallenge(challenge)">
                        <mat-icon>visibility</mat-icon> View Details
                      </button>
                    }
                  </mat-card-actions>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <span class="disputes-tab-label">
              Disputes
              @if (disputedChallenges.length > 0) {
                <span class="dispute-count">{{ disputedChallenges.length }}</span>
              }
            </span>
          </ng-template>
          <div class="challenges-list">
            @if (disputedChallenges.length === 0) {
              <div class="empty-state">
                <mat-icon>check_circle</mat-icon>
                <p>No disputes - all matches resolved!</p>
              </div>
            } @else {
              <div class="dispute-info">
                <mat-icon>info</mat-icon>
                <p>These matches have conflicting results. Click to view details and resolve.</p>
              </div>
              @for (challenge of disputedChallenges; track challenge.id) {
                <mat-card class="challenge-card disputed clickable" [class.highlighted]="challenge.id === highlightedChallengeId" (click)="viewChallenge(challenge)">
                  <mat-card-header>
                    @if (challenge.challengerId === currentUserId) {
                      <mat-card-title>vs {{ challenge.challengee.username }}</mat-card-title>
                      <mat-card-subtitle>You challenged</mat-card-subtitle>
                    } @else {
                      <mat-card-title>vs {{ challenge.challenger.username }}</mat-card-title>
                      <mat-card-subtitle>Challenged you</mat-card-subtitle>
                    }
                  </mat-card-header>
                  <mat-card-content>
                    <div class="badges">
                      <span class="badge game">{{ challenge.leaderboard.game.name }}</span>
                      <span class="badge platform">{{ challenge.leaderboard.platform.name }}</span>
                      <span class="badge type" [class]="challenge.type.toLowerCase()">{{ challenge.type }}</span>
                      <span class="badge status disputed">DISPUTED</span>
                    </div>
                    <div class="reported-results">
                      <div class="report">
                        <strong>{{ challenge.challenger.username }}</strong> reported:
                        <span class="winner">{{ getReportedWinnerName(challenge, challenge.challengerReportedWinnerId) }}</span>
                      </div>
                      <div class="report">
                        <strong>{{ challenge.challengee.username }}</strong> reported:
                        <span class="winner">{{ getReportedWinnerName(challenge, challenge.challengeeReportedWinnerId) }}</span>
                      </div>
                    </div>
                    <div class="details">
                      <p><strong>Best of:</strong> {{ challenge.bestOf }}</p>
                      <p><strong>Maps:</strong> {{ challenge.selectedMaps?.join(', ') }}</p>
                      <p class="time">{{ getTimeAgo(challenge.createdAt) }}</p>
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    <button mat-raised-button color="primary" (click)="viewChallenge(challenge); $event.stopPropagation()">
                      <mat-icon>gavel</mat-icon> Resolve Dispute
                    </button>
                  </mat-card-actions>
                </mat-card>
              }
            }
          </div>
        </mat-tab>

        <mat-tab label="All">
          <div class="challenges-list">
            @if (allChallenges.length === 0) {
              <div class="empty-state">
                <mat-icon>sports_esports</mat-icon>
                <p>No challenges yet</p>
              </div>
            } @else {
              @for (challenge of allChallenges; track challenge.id) {
                <mat-card class="challenge-card clickable" [class.highlighted]="challenge.id === highlightedChallengeId" (click)="viewChallenge(challenge)">
                  <mat-card-header>
                    @if (challenge.challengerId === currentUserId) {
                      <mat-card-title>vs {{ challenge.challengee.username }}</mat-card-title>
                      <mat-card-subtitle>You challenged</mat-card-subtitle>
                    } @else {
                      <mat-card-title>vs {{ challenge.challenger.username }}</mat-card-title>
                      <mat-card-subtitle>Challenged you</mat-card-subtitle>
                    }
                  </mat-card-header>
                  <mat-card-content>
                    <div class="badges">
                      <span class="badge game">{{ challenge.leaderboard.game.name }}</span>
                      <span class="badge platform">{{ challenge.leaderboard.platform.name }}</span>
                      <span class="badge type" [class]="challenge.type.toLowerCase()">{{ challenge.type }}</span>
                      <span class="badge status" [class]="challenge.status.toLowerCase()">{{ challenge.status }}</span>
                    </div>
                    <div class="details">
                      <p><strong>Best of:</strong> {{ challenge.bestOf }}</p>
                      <p><strong>Maps:</strong> {{ challenge.selectedMaps?.join(', ') }}</p>
                      <p class="time">{{ getTimeAgo(challenge.createdAt) }}</p>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .challenges-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;

      h1 {
        margin-bottom: 24px;
        color: white;
      }
    }

    .challenges-list {
      padding: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
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
        margin-bottom: 16px;
        opacity: 0.3;
      }

      p {
        margin: 0;
        font-size: 16px;
      }
    }

    .challenge-card {
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

    .badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge.game {
      background: rgba(100, 181, 246, 0.15);
      color: var(--theme-primary-bright, #64b5f6);
    }

    .badge.platform {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.7);
    }

    .badge.type.ranked {
      background: rgba(255, 183, 77, 0.15);
      color: #ffb74d;
    }

    .badge.type.xp {
      background: rgba(129, 199, 132, 0.15);
      color: #81c784;
    }

    .badge.status.pending {
      background: rgba(255, 183, 77, 0.15);
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

    .badge.status.cancelled {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.5);
    }

    .badge.status.completed {
      background: rgba(100, 181, 246, 0.15);
      color: var(--theme-primary-bright, #64b5f6);
    }

    .badge.status.disputed {
      background: rgba(229, 115, 115, 0.15);
      color: #e57373;
    }

    .disputes-tab-label {
      display: flex;
      align-items: center;
      gap: 8px;

      .dispute-count {
        background: #ef5350;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }
    }

    .dispute-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 183, 77, 0.08);
      border-radius: 8px;
      margin-bottom: 8px;
      border-left: 3px solid #ffb74d;

      mat-icon {
        color: #ffb74d;
        flex-shrink: 0;
      }

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
      }
    }

    .challenge-card.disputed {
      border-left: 3px solid #ef5350;
    }

    .reported-results {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;

      .report {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);

        .winner {
          color: var(--theme-primary-bright, #64b5f6);
          font-weight: 500;
        }
      }
    }

    .details {
      p {
        margin: 4px 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);

        strong {
          color: rgba(255, 255, 255, 0.5);
        }
      }

      .time {
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
        margin-top: 8px;
      }
    }

    mat-card-actions {
      display: flex;
      gap: 8px;
      padding: 16px;
    }

    .challenge-card.clickable {
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #252525 !important;
      }
    }

    .challenge-card.highlighted {
      border: 1px solid var(--theme-primary-bright, #64b5f6);
      animation: highlight-pulse 2s ease-in-out;
    }

    @keyframes highlight-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(100, 181, 246, 0.3);
      }
      50% {
        box-shadow: 0 0 15px 2px rgba(100, 181, 246, 0.2);
      }
      100% {
        box-shadow: none;
      }
    }
  `]
})
export class ChallengesComponent implements OnInit {
  allChallenges: Match[] = [];
  incomingChallenges: Match[] = [];
  outgoingChallenges: Match[] = [];
  disputedChallenges: Match[] = [];
  currentTab = 0;
  highlightedChallengeId: string | null = null;

  constructor(
    private challengesService: ChallengesService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get currentUserId(): string | null {
    return this.authService.currentUser()?.id ?? null;
  }

  ngOnInit(): void {
    this.loadChallenges();
  }

  loadChallenges(): void {
    this.challengesService.getMyChallenges().subscribe(challenges => {
      // Check for highlight query param
      const highlightId = this.route.snapshot.queryParams['highlight'];
      this.highlightedChallengeId = highlightId || null;

      // Find the highlighted challenge to determine which tab to show
      const highlightedChallenge = highlightId
        ? challenges.find(c => c.id === highlightId)
        : null;

      // Sort function to put highlighted challenge first
      const sortWithHighlightFirst = (list: Match[]) => {
        if (!highlightId) return list;
        return [...list].sort((a, b) => {
          if (a.id === highlightId) return -1;
          if (b.id === highlightId) return 1;
          return 0;
        });
      };

      // Build lists and put highlighted challenge first
      this.incomingChallenges = sortWithHighlightFirst(
        challenges.filter(c => c.challengeeId === this.currentUserId)
      );
      this.outgoingChallenges = sortWithHighlightFirst(
        challenges.filter(c => c.challengerId === this.currentUserId)
      );
      this.disputedChallenges = sortWithHighlightFirst(
        challenges.filter(c => c.status === 'DISPUTED')
      );
      this.allChallenges = sortWithHighlightFirst(challenges);

      // Switch to the appropriate tab if we have a highlighted challenge
      if (highlightedChallenge) {
        if (highlightedChallenge.status === 'DISPUTED') {
          this.currentTab = 2; // Disputes tab
        } else if (highlightedChallenge.challengeeId === this.currentUserId) {
          this.currentTab = 0; // Incoming tab
        } else if (highlightedChallenge.challengerId === this.currentUserId) {
          this.currentTab = 1; // Outgoing tab
        }

        // Clear the query param after a delay so refreshing doesn't keep highlighting
        setTimeout(() => {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
          });
        }, 3000);
      }
    });
  }

  onTabChange(index: number): void {
    this.currentTab = index;
    // Clear highlight when user manually switches tabs
    this.highlightedChallengeId = null;
  }

  acceptChallenge(challenge: Match): void {
    this.challengesService.acceptChallenge(challenge.id).subscribe({
      next: () => {
        this.snackBar.open('Challenge accepted!', 'Close', { duration: 3000 });
        this.loadChallenges();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to accept challenge', 'Close', { duration: 3000 });
      }
    });
  }

  declineChallenge(challenge: Match): void {
    this.challengesService.declineChallenge(challenge.id).subscribe({
      next: () => {
        this.snackBar.open('Challenge declined', 'Close', { duration: 3000 });
        this.loadChallenges();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to decline challenge', 'Close', { duration: 3000 });
      }
    });
  }

  cancelChallenge(challenge: Match): void {
    this.challengesService.cancelChallenge(challenge.id).subscribe({
      next: () => {
        this.snackBar.open('Challenge cancelled', 'Close', { duration: 3000 });
        this.loadChallenges();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to cancel challenge', 'Close', { duration: 3000 });
      }
    });
  }

  viewChallenge(challenge: Match): void {
    this.router.navigate(['/challenges', challenge.id]);
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  }

  getReportedWinnerName(challenge: Match, winnerId: string | undefined): string {
    if (!winnerId) return 'Not reported';
    if (winnerId === challenge.challengerId) {
      return challenge.challenger.username;
    }
    return challenge.challengee.username;
  }
}
