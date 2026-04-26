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
import { mapImageUrl } from '../games/map-assets';
import gsap from 'gsap';

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
    <div class="arena-matches-page">
      <div class="arena-bg" aria-hidden="true"></div>
      <div class="arena-inner challenges-container">
      <header class="arena-hero" aria-labelledby="challenges-hero-title">
        <div class="arena-hero-inner">
          <p class="arena-kicker">
            <span class="arena-kicker-mark" aria-hidden="true"></span>
            Queue
          </p>
          <h1 id="challenges-hero-title">My matches</h1>
          <p class="arena-sub">Incoming, outgoing, disputes — one screen.</p>
        </div>
      </header>

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
                  @if (challenge.selectedMaps.length > 0) {
                    <div
                      class="challenge-card-hero"
                      [style.background-image]="'url(' + firstMapHeroUrl(challenge) + ')'"
                      role="img"
                      [attr.aria-label]="'Map: ' + challenge.selectedMaps[0]"></div>
                  }
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
                      @if (refAppealAvailable(challenge)) {
                        <span class="badge appeal">Appeal to admin</span>
                      }
                    </div>
                    <div class="details">
                      <p><strong>Best of:</strong> {{ challenge.bestOf }}</p>
                      <p><strong>Maps:</strong> {{ challenge.selectedMaps.join(', ') }}</p>
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
                    @if (challenge.status === 'ACCEPTED' || challenge.status === 'DISPUTED' || challenge.status === 'COMPLETED') {
                      <button mat-button color="primary" (click)="viewChallenge(challenge)">
                        <mat-icon>visibility</mat-icon> View details
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
                  @if (challenge.selectedMaps.length > 0) {
                    <div
                      class="challenge-card-hero"
                      [style.background-image]="'url(' + firstMapHeroUrl(challenge) + ')'"
                      role="img"
                      [attr.aria-label]="'Map: ' + challenge.selectedMaps[0]"></div>
                  }
                  <mat-card-header>
                    <mat-card-title>{{ challenge.challengee?.username ?? 'Open listing' }}</mat-card-title>
                    <mat-card-subtitle>you challenged</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="badges">
                      <span class="badge game">{{ challenge.leaderboard.game.name }}</span>
                      <span class="badge platform">{{ challenge.leaderboard.platform.name }}</span>
                      <span class="badge type" [class]="challenge.type.toLowerCase()">{{ challenge.type }}</span>
                      <span class="badge status" [class]="challenge.status.toLowerCase()">{{ challenge.status }}</span>
                      @if (refAppealAvailable(challenge)) {
                        <span class="badge appeal">Appeal to admin</span>
                      }
                    </div>
                    <div class="details">
                      <p><strong>Best of:</strong> {{ challenge.bestOf }}</p>
                      <p><strong>Maps:</strong> {{ challenge.selectedMaps.join(', ') }}</p>
                      <p class="time">{{ getTimeAgo(challenge.createdAt) }}</p>
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    @if (challenge.status === 'PENDING') {
                      <button mat-button color="warn" (click)="cancelChallenge(challenge)">
                        <mat-icon>cancel</mat-icon> Cancel
                      </button>
                    }
                    @if (challenge.status === 'ACCEPTED' || challenge.status === 'DISPUTED' || challenge.status === 'COMPLETED') {
                      <button mat-button color="primary" (click)="viewChallenge(challenge)">
                        <mat-icon>visibility</mat-icon> View details
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
                  @if (challenge.selectedMaps.length > 0) {
                    <div
                      class="challenge-card-hero"
                      [style.background-image]="'url(' + firstMapHeroUrl(challenge) + ')'"
                      role="img"
                      [attr.aria-label]="'Map: ' + challenge.selectedMaps[0]"></div>
                  }
                  <mat-card-header>
                    <mat-card-title>vs {{ challenge.challengerId === currentUserId ? (challenge.challengee?.username ?? 'Open listing') : challenge.challenger.username }}</mat-card-title>
                    <mat-card-subtitle>{{ challenge.challengerId === currentUserId ? 'You challenged' : 'Challenged you' }}</mat-card-subtitle>
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
                        <strong>{{ challenge.challengee?.username ?? '—' }}</strong> reported:
                        <span class="winner">{{ getReportedWinnerName(challenge, challenge.challengeeReportedWinnerId) }}</span>
                      </div>
                    </div>
                    <div class="details">
                      <p><strong>Best of:</strong> {{ challenge.bestOf }}</p>
                      <p><strong>Maps:</strong> {{ challenge.selectedMaps.join(', ') }}</p>
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
                  @if (challenge.selectedMaps.length > 0) {
                    <div
                      class="challenge-card-hero"
                      [style.background-image]="'url(' + firstMapHeroUrl(challenge) + ')'"
                      role="img"
                      [attr.aria-label]="'Map: ' + challenge.selectedMaps[0]"></div>
                  }
                  <mat-card-header>
                    <mat-card-title>vs {{ challenge.challengerId === currentUserId ? (challenge.challengee?.username ?? 'Open listing') : challenge.challenger.username }}</mat-card-title>
                    <mat-card-subtitle>{{ challenge.challengerId === currentUserId ? 'You challenged' : 'Challenged you' }}</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="badges">
                      <span class="badge game">{{ challenge.leaderboard.game.name }}</span>
                      <span class="badge platform">{{ challenge.leaderboard.platform.name }}</span>
                      <span class="badge type" [class]="challenge.type.toLowerCase()">{{ challenge.type }}</span>
                      <span class="badge status" [class]="challenge.status.toLowerCase()">{{ challenge.status }}</span>
                      @if (refAppealAvailable(challenge)) {
                        <span class="badge appeal">Appeal to admin</span>
                      }
                    </div>
                    <div class="details">
                      <p><strong>Best of:</strong> {{ challenge.bestOf }}</p>
                      <p><strong>Maps:</strong> {{ challenge.selectedMaps.join(', ') }}</p>
                      <p class="time">{{ getTimeAgo(challenge.createdAt) }}</p>
                    </div>
                  </mat-card-content>
                  <mat-card-actions>
                    <button
                      mat-button
                      color="primary"
                      (click)="viewChallenge(challenge); $event.stopPropagation()">
                      <mat-icon>visibility</mat-icon> View details
                    </button>
                  </mat-card-actions>
                </mat-card>
              }
            }
          </div>
        </mat-tab>
      </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    .arena-matches-page {
      position: relative;
      min-height: 100%;
      margin: -24px -16px 0;
      padding-bottom: 48px;
    }

    .arena-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(ellipse 80% 55% at 100% 0%, rgba(var(--theme-primary-rgb, 37, 99, 235), 0.14), transparent 52%),
        linear-gradient(168deg, #0c0c10 0%, #141418 40%, #0a0a0f 100%);
    }

    .arena-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.035;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .arena-inner.challenges-container {
      position: relative;
      z-index: 1;
      max-width: 880px;
      margin: 0 auto;
      padding: clamp(3rem, 8vw, 4.25rem) 24px 48px;
    }

    .arena-hero {
      position: relative;
      margin-bottom: 36px;
      margin-top: 0;
    }

    .arena-hero-inner {
      position: relative;
      padding: 1.75rem 1.5rem 1.85rem 1.65rem;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.07);
      background:
        linear-gradient(
          125deg,
          rgba(255, 255, 255, 0.055) 0%,
          rgba(255, 255, 255, 0.02) 42%,
          transparent 72%
        ),
        linear-gradient(180deg, rgba(12, 14, 22, 0.85) 0%, rgba(8, 9, 14, 0.65) 100%);
      box-shadow:
        0 28px 56px rgba(0, 0, 0, 0.42),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      overflow: hidden;
    }

    .arena-hero-inner::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--theme-primary, #2563eb);
      pointer-events: none;
    }

    .arena-hero-inner::after {
      content: '';
      position: absolute;
      top: -40%;
      right: -15%;
      width: min(55%, 280px);
      aspect-ratio: 1;
      border-radius: 50%;
      background: radial-gradient(
        circle,
        rgba(var(--theme-primary-rgb, 37, 99, 235), 0.12) 0%,
        transparent 68%
      );
      pointer-events: none;
    }

    .arena-kicker {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 14px 0;
      font-family: 'DM Sans', sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.45);
    }

    .arena-kicker-mark {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--theme-primary-bright, #93c5fd);
      box-shadow:
        0 0 0 3px rgba(var(--theme-primary-rgb, 37, 99, 235), 0.35),
        0 0 18px rgba(var(--theme-primary-rgb, 37, 99, 235), 0.55);
      animation: arena-kicker-pulse 2.4s ease-in-out infinite;
    }

    @keyframes arena-kicker-pulse {
      0%,
      100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.75;
        transform: scale(0.92);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .arena-kicker-mark {
        animation: none;
      }
    }

    .arena-hero h1 {
      position: relative;
      z-index: 1;
      margin: 0 0 12px 0;
      font-family: 'Bebas Neue', sans-serif;
      font-size: clamp(2.65rem, 6.5vw, 3.75rem);
      font-weight: 400;
      letter-spacing: 0.1em;
      line-height: 0.98;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.98);
      text-shadow:
        0 2px 3px rgba(0, 0, 0, 0.45),
        0 12px 40px rgba(0, 0, 0, 0.35);
    }

    .arena-sub {
      position: relative;
      z-index: 1;
      margin: 0;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      line-height: 1.55;
      color: rgba(255, 255, 255, 0.48);
      max-width: 26rem;
    }

    .challenge-card-hero {
      height: 132px;
      background-size: cover;
      background-position: center;
      position: relative;
      margin: -16px -16px 0 -16px;
    }

    .challenge-card-hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 0%, rgba(10, 10, 15, 0.65) 100%);
      pointer-events: none;
    }

    .challenges-container {
      padding: 0;
      max-width: 880px;
      margin: 0 auto;
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
      border-radius: 14px !important;
      border: 1px solid rgba(255, 255, 255, 0.07) !important;
      background: rgba(255, 255, 255, 0.03) !important;
      backdrop-filter: blur(10px);
      overflow: hidden;

      mat-card-header {
        margin-bottom: 16px;
      }

      mat-card-title {
        color: white !important;
        font-family: 'DM Sans', sans-serif;
        font-weight: 600;
      }

      mat-card-subtitle {
        color: rgba(255, 255, 255, 0.55) !important;
        font-family: 'DM Sans', sans-serif;
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

    .badge.appeal {
      background: rgba(255, 152, 0, 0.18);
      color: #ffb74d;
      text-transform: none;
      letter-spacing: 0.2px;
      font-size: 10px;
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
      setTimeout(() => this.runCardStagger(), 0);
    });
  }

  firstMapHeroUrl(challenge: Match): string {
    const first = challenge.selectedMaps[0];
    return mapImageUrl(challenge.leaderboard.game.name, first);
  }

  private runCardStagger(): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const tab = document.querySelector('.arena-matches-page .mat-mdc-tab-body-active .challenges-list')
      ?? document.querySelector('.arena-matches-page .challenges-list');
    if (!tab) return;
    const cards = tab.querySelectorAll('.challenge-card');
    if (!cards.length) return;
    gsap.from(cards, {
      opacity: 0,
      y: 20,
      duration: 0.42,
      stagger: 0.04,
      ease: 'power2.out',
    });
  }

  onTabChange(index: number): void {
    this.currentTab = index;
    // Clear highlight when user manually switches tabs
    this.highlightedChallengeId = null;
    setTimeout(() => this.runCardStagger(), 0);
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

  /** XP / Ranked: ref ruled, players can still escalate to admin (same rules as challenge detail). */
  refAppealAvailable(challenge: Match): boolean {
    if ((challenge.type !== 'XP' && challenge.type !== 'RANKED') || challenge.status !== 'COMPLETED') {
      return false;
    }
    if (challenge.adminResolvedByUserId || challenge.disputePhase === 'AWAITING_ADMIN') {
      return false;
    }
    return (
      challenge.disputePhase === 'REF_DECIDED' ||
      (!!challenge.refResolvedByUserId &&
        challenge.disputePhase === 'FINAL' &&
        !challenge.adminResolvedByUserId)
    );
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
    return challenge.challengee?.username ?? '—';
  }
}
