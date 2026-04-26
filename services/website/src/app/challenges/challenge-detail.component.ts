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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ChallengesService, Match } from './challenges.service';
import { AuthService, User } from '../auth/auth.service';
import { LeaderboardsService } from '../leaderboard/leaderboards.service';
import { GamesService } from '../games/games.service';
import { mapImageUrl } from '../games/map-assets';

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
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <div class="arena-challenge-detail">
    <div class="detail-bg" aria-hidden="true"></div>
    <div class="challenge-detail-container">
      @if (loading) {
        <div class="loading detail-loading">
          <mat-spinner diameter="44"></mat-spinner>
          <p class="loading-label">Loading match</p>
        </div>
      } @else if (match) {
        <div class="detail-toolbar">
          <button type="button" mat-button class="detail-back-btn" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            <span>Challenges</span>
          </button>
          @if (match.shareToken) {
            <button type="button" mat-stroked-button class="detail-share-btn" (click)="copyShareLink()">
              <mat-icon>share</mat-icon>
              Copy link
            </button>
          }
        </div>

        <mat-card class="detail-match-card match-card">
          @if (match.selectedMaps.length > 0) {
            <div
              class="detail-card-hero"
              [style.background-image]="'url(' + firstMapHeroUrl() + ')'"
              role="img"
              [attr.aria-label]="'Map: ' + match.selectedMaps[0]">
              <div class="detail-card-hero-overlay"></div>
              <div class="detail-card-hero-strip">
                <span class="detail-hero-kicker">Arena</span>
                <span class="detail-hero-sub">{{ match.leaderboard.game.name }} · {{ match.leaderboard.platform.name }}</span>
              </div>
            </div>
          }
          <mat-card-header class="detail-card-heading">
            <mat-card-title class="match-title">
              @if (isOpenMatchPending) {
                {{ match.challenger.username }} — open XP listing
              } @else {
                {{ match.challenger.username }} vs {{ match.challengee?.username }}
              }
            </mat-card-title>
            <mat-card-subtitle class="detail-card-subtitle">
              @if (match.selectedMaps.length === 0) {
                {{ match.leaderboard.game.name }} · {{ match.leaderboard.platform.name }}
              } @else {
                Bo{{ match.bestOf }} · {{ match.type }}
              }
            </mat-card-subtitle>
          </mat-card-header>

          @if (isOpenMatchPending) {
            <mat-card-content>
              <p class="open-copy">
                This is an open listing on the XP ladder. Another player can accept to start the match.
              </p>
              <div class="match-info">
                <div class="badges">
                  <span class="badge type xp">{{ match.type }}</span>
                  <span class="badge status pending">{{ match.status }}</span>
                  <span class="badge best-of">Best of {{ match.bestOf }}</span>
                </div>
              </div>
              <div class="map-chips">
                @for (map of match.selectedMaps; track $index) {
                  <span class="map-chip">{{ map }}</span>
                }
              </div>
            </mat-card-content>
            <mat-card-actions class="open-actions">
              @if (isChallenger) {
                <button mat-stroked-button color="warn" (click)="cancelOpenListing()" [disabled]="submitting">
                  Cancel listing
                </button>
              } @else if (currentUserId && !isChallenger) {
                <button mat-raised-button color="primary" (click)="acceptOpenListing()" [disabled]="submitting">
                  Accept match
                </button>
              } @else {
                <p class="hint">Sign in to accept this listing.</p>
              }
            </mat-card-actions>
          }

          @if (!isOpenMatchPending) {
          <mat-card-content>
            @if (match.status === 'PENDING' && isChallenger && match.challengee) {
              <div class="pending-challenger-panel detail-inset-panel">
                <h3 class="detail-section-title pending-title">Maps</h3>
                <p class="pending-hint">
                  @if (match.type === 'RANKED') {
                    <span class="pending-hint-lead">Ranked is best of 3 — you set all three maps. </span>
                  }
                  Edit maps or cancel before {{ match.challengee.username }} accepts.
                </p>
                <div class="pending-map-grid">
                  @for (map of pendingMapDrafts; track $index; let i = $index) {
                    <mat-form-field appearance="outline" class="pending-map-field">
                      <mat-label>Map {{ i + 1 }}</mat-label>
                      <mat-select [(ngModel)]="pendingMapDrafts[i]">
                        @for (opt of mapOptions; track opt) {
                          <mat-option [value]="opt">{{ opt }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  }
                </div>
                <div class="pending-actions">
                  <button mat-raised-button color="primary" (click)="savePendingMaps()" [disabled]="submitting || !pendingMapDraftsValid">
                    Save maps
                  </button>
                  <button mat-stroked-button color="warn" (click)="cancelPendingChallenge()" [disabled]="submitting">
                    Cancel challenge
                  </button>
                </div>
              </div>
            }

            <div class="match-info">
              <div class="badges">
                <span class="badge type" [class]="match.type.toLowerCase()">{{ match.type }}</span>
                <span class="badge status" [class]="match.status.toLowerCase()">{{ match.status }}</span>
                <span class="badge best-of">Best of {{ match.bestOf }}</span>
              </div>
            </div>

            <!-- Dispute Warning -->
            @if (match.status === 'DISPUTED') {
              <div class="dispute-warning detail-section detail-section--dispute">
                <mat-icon>warning</mat-icon>
                <div class="dispute-text">
                  @if (match.disputePhase === 'AWAITING_ADMIN') {
                    <strong>Awaiting admin decision</strong>
                    @if (match.type === 'XP') {
                      <p>A ref ruling was disputed. An admin will set the final winner.</p>
                    } @else {
                      <p>An admin will set the final winner.</p>
                    }
                  } @else if (match.disputePhase === 'AWAITING_REF') {
                    <strong>Awaiting staff review</strong>
                    <p>Results conflict — a ref or admin will decide the winner.</p>
                  } @else {
                    <strong>This match is disputed!</strong>
                    <p>Both players reported different winners. You can either update your report or concede to accept your opponent's result.</p>
                  }
                </div>
              </div>
            }

            <!-- Reporting Status -->
            @if (match.status === 'ACCEPTED' || match.status === 'DISPUTED') {
              <div class="reporting-status detail-section detail-section--reports">
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
                  <span class="reporter-name">{{ match.challengee?.username ?? '—' }}</span>
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
              <div class="score-display detail-scoreboard">
                <span class="player-score" [class.winner]="challengerWins > challengeeWins">
                  {{ match.challenger.username }}
                </span>
                <span class="score">
                  <span [class.winning]="challengerWins > challengeeWins">{{ challengerWins }}</span>
                  <span class="separator">-</span>
                  <span [class.winning]="challengeeWins > challengerWins">{{ challengeeWins }}</span>
                </span>
                <span class="player-score" [class.winner]="challengeeWins > challengerWins">
                  {{ match.challengee?.username ?? '—' }}
                </span>
              </div>
            }

            <!-- Map Results Section -->
            @if (canReport) {
              <div class="map-results-section detail-section">
                <h3 class="detail-section-title">Map results</h3>
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
                        {{ match.challengee?.username ?? 'Challengee' }}
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
              @if (match.disputePhase) {
                <p class="phase-line">Status: {{ match.disputePhase }}</p>
              }
              @if ((match.type === 'XP' || match.type === 'RANKED') && match.disputePhase === 'REF_DECIDED' && !match.adminResolvedByUserId) {
                <p class="ref-appeal-hint">
                  A ref set this result. Either player may escalate to an admin if you disagree.
                </p>
              }
            }

            @if (canDisputeRefDecision) {
              <mat-divider></mat-divider>
              <div class="ref-dispute-actions">
                <p>If you believe the ref made the wrong call, you can escalate to an admin.</p>
                <button mat-stroked-button color="warn" (click)="disputeRefDecision()" [disabled]="submitting">
                  Dispute ref decision
                </button>
              </div>
            }
          </mat-card-content>

          <!-- Actions -->
          @if (canReport) {
            <mat-card-actions class="detail-card-actions">
              <button
                mat-raised-button
                color="primary"
                (click)="submitResult()"
                [disabled]="!calculatedWinnerId || submitting">
                @if (submitting) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <span class="submit-result-btn-content">
                    <mat-icon matButtonIcon>save</mat-icon>
                    {{ hasAlreadyReported ? 'Update Results' : 'Submit Results' }}
                  </span>
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
          }
        </mat-card>
      } @else {
        <div class="not-found detail-not-found">
          <div class="detail-not-found-icon" aria-hidden="true">
            <mat-icon>error_outline</mat-icon>
          </div>
          <h2>Match not found</h2>
          <p class="detail-not-found-hint">It may have been removed or the link is invalid.</p>
          <button mat-raised-button color="primary" (click)="goBack()">Back to challenges</button>
        </div>
      }
    </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .arena-challenge-detail {
      position: relative;
      margin: -24px -16px 0;
      padding: 0 0 56px;
    }

    /* Fixed layer fills the main panel below the 72px bar without inflating document height (avoids extra scroll). */
    .detail-bg {
      position: fixed;
      top: 72px;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(ellipse 90% 55% at 50% 100%, rgba(var(--theme-primary-rgb, 37, 99, 235), 0.09), transparent 52%),
        radial-gradient(ellipse 85% 50% at 100% -5%, rgba(var(--theme-primary-rgb, 37, 99, 235), 0.14), transparent 55%),
        radial-gradient(ellipse 60% 40% at -5% 30%, rgba(var(--theme-primary-rgb, 37, 99, 235), 0.06), transparent 50%),
        linear-gradient(168deg, #0c0c12 0%, #10141c 42%, #0a1020 100%);
    }

    .detail-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.04;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .challenge-detail-container {
      position: relative;
      z-index: 1;
      padding: clamp(2.75rem, 7vw, 4rem) 24px 32px;
      max-width: 680px;
      margin: 0 auto;
    }

    .detail-loading.loading,
    .detail-not-found.not-found {
      padding: clamp(3rem, 10vw, 5rem) 24px;
    }

    .loading,
    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
    }

    .loading-label {
      margin: 20px 0 0 0;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.4);
    }

    .detail-not-found h2 {
      margin: 20px 0 8px 0;
      font-family: 'Bebas Neue', sans-serif;
      font-size: clamp(1.85rem, 4vw, 2.5rem);
      letter-spacing: 0.06em;
      color: rgba(255, 255, 255, 0.92);
    }

    .detail-not-found-hint {
      margin: 0 0 24px 0;
      max-width: 320px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.45);
    }

    .detail-not-found-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);

      mat-icon {
        font-size: 44px;
        width: 44px;
        height: 44px;
        opacity: 0.45;
        color: rgba(255, 255, 255, 0.45);
      }
    }

    .detail-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 22px;
    }

    .detail-back-btn {
      color: rgba(255, 255, 255, 0.72) !important;
      font-family: 'DM Sans', sans-serif;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.02em;
      border-radius: 0 10px 10px 0;
      padding-left: 4px;
      border-left: 3px solid var(--theme-primary, #2563eb);

      mat-icon {
        margin-right: 4px;
        opacity: 0.85;
      }
    }

    .detail-share-btn {
      color: var(--theme-primary-bright, #93c5fd) !important;
      border-color: rgba(var(--theme-primary-rgb, 37, 99, 235), 0.45) !important;
      background: rgba(var(--theme-primary-rgb, 37, 99, 235), 0.06) !important;
      font-family: 'DM Sans', sans-serif;
      font-weight: 600;
      font-size: 13px;
      border-radius: 10px;

      mat-icon {
        font-size: 18px;
        margin-right: 4px;
        opacity: 0.9;
      }
    }

    .detail-match-card.match-card {
      overflow: hidden !important;
      border-radius: 2px 16px 16px 2px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      background: linear-gradient(
        145deg,
        rgba(22, 24, 32, 0.92) 0%,
        rgba(14, 14, 18, 0.88) 100%
      ) !important;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow:
        0 32px 64px rgba(0, 0, 0, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .detail-card-hero {
      position: relative;
      height: 140px;
      margin: -16px -16px 0 -16px;
      background-size: cover;
      background-position: center;
    }

    .detail-card-hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(8, 9, 14, 0.15) 0%,
        rgba(8, 9, 14, 0.75) 55%,
        rgba(0, 0, 0, 0.92) 100%
      );
      pointer-events: none;
    }

    .detail-card-hero-strip {
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 14px;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-hero-kicker {
      font-family: 'DM Sans', sans-serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.45);
    }

    .detail-hero-sub {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.88);
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
    }

    .detail-card-heading {
      padding-top: 8px !important;
    }

    .detail-card-heading ::ng-deep .mat-mdc-card-header-text {
      width: 100%;
    }

    .detail-card-heading ::ng-deep .mat-mdc-card-title {
      font-family: 'Bebas Neue', sans-serif !important;
      font-size: clamp(1.75rem, 4.5vw, 2.35rem) !important;
      letter-spacing: 0.06em !important;
      line-height: 1.05 !important;
      color: rgba(255, 255, 255, 0.98) !important;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
    }

    .detail-card-subtitle {
      font-family: 'DM Sans', sans-serif !important;
      font-size: 13px !important;
      font-weight: 700;
      letter-spacing: 0.12em !important;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.38) !important;
      margin-top: 0.35rem !important;
    }

    .match-card {
      mat-card-header {
        margin-bottom: 8px;
      }
    }

    .match-title {
      font-size: inherit !important;
    }

    .detail-section-title {
      margin: 0 0 14px 0;
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.38);
    }

    .detail-section {
      margin-top: 20px;
    }

    .open-copy {
      margin: 0 0 16px;
      font-size: 14px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.65);
    }

    .map-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .map-chip {
      padding: 7px 14px;
      border-radius: 8px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.82);
    }

    .open-actions {
      padding: 16px !important;
      flex-wrap: wrap;
      gap: 12px;

      .hint {
        margin: 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .detail-inset-panel.pending-challenger-panel {
      margin-bottom: 24px;
      padding: 20px 18px 20px 20px;
      border-radius: 2px 12px 12px 2px;
      background: rgba(0, 0, 0, 0.38);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-left: 3px solid var(--theme-primary, #2563eb);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .pending-challenger-panel .detail-section-title.pending-title {
      margin-bottom: 10px;
    }

    .pending-hint {
      margin: 0 0 16px 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.55);
      line-height: 1.45;
    }

    .pending-hint-lead {
      color: rgba(255, 255, 255, 0.72);
    }

    .pending-map-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .pending-map-field {
      width: 100%;
    }

    .pending-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
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

    .detail-scoreboard.score-display {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px 20px;
      padding: 22px 18px;
      margin: 8px 0 0 0;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 45%),
        rgba(0, 0, 0, 0.35);
      border-radius: 2px 12px 12px 2px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .detail-scoreboard .player-score {
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.72);
      text-align: center;
      line-height: 1.25;

      &.winner {
        color: #86efac;
        text-shadow: 0 0 24px rgba(34, 197, 94, 0.25);
      }
    }

    .detail-scoreboard .player-score:first-of-type {
      text-align: right;
    }

    .detail-scoreboard .player-score:last-of-type {
      text-align: left;
    }

    .detail-scoreboard .score {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Bebas Neue', sans-serif;
      font-size: clamp(2rem, 6vw, 2.75rem);
      font-weight: 400;
      letter-spacing: 0.06em;
      color: rgba(255, 255, 255, 0.96);
      line-height: 1;

      .separator {
        color: rgba(255, 255, 255, 0.22);
        font-weight: 400;
      }

      .winning {
        color: #86efac;
      }
    }

    .map-results-section {
      margin: 8px 0 0 0;
    }

    .map-result-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      padding: 16px 16px 16px 18px;
      margin-bottom: 10px;
      background: rgba(0, 0, 0, 0.28);
      border-radius: 2px 10px 10px 2px;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-left: 3px solid rgba(var(--theme-primary-rgb, 37, 99, 235), 0.65);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);

      .map-info {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex: 1;
        min-width: 0;

        .map-number {
          font-family: 'DM Sans', sans-serif;
          color: rgba(255, 255, 255, 0.38);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          min-width: 52px;
        }

        .map-name {
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.94);
        }
      }

      .map-winner-select {
        display: flex;
        flex-wrap: wrap;
        gap: 16px 20px;
      }
    }

    .map-result-row ::ng-deep .mat-mdc-radio-button .mdc-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.75);
    }

    .calculated-winner,
    .match-winner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 8px;
      padding: 20px;
      font-family: 'DM Sans', sans-serif;
      font-size: 17px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.92);
      background: rgba(251, 191, 36, 0.06);
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: 2px 12px 12px 2px;

      mat-icon {
        color: #fbbf24;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      strong {
        font-weight: 700;
        color: #fde68a;
      }
    }

    .dispute-warning.detail-section--dispute {
      gap: 14px;
      padding: 18px 18px 18px 16px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(0, 0, 0, 0.35) 100%);
      border-radius: 2px 12px 12px 2px;
      margin: 0;
      border: 1px solid rgba(248, 113, 113, 0.25);
      border-left: 4px solid #ef4444;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);

      mat-icon {
        color: #f87171;
        font-size: 26px;
        width: 26px;
        height: 26px;
      }

      .dispute-text {
        font-family: 'DM Sans', sans-serif;

        strong {
          display: block;
          color: #fecaca;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        p {
          margin: 8px 0 0 0;
          color: rgba(255, 255, 255, 0.62);
          font-size: 13px;
          line-height: 1.5;
        }
      }
    }

    .reporting-status.detail-section--reports {
      gap: 10px;
      padding: 14px;
      margin: 0;
      background: rgba(0, 0, 0, 0.22);
      border-radius: 2px 12px 12px 2px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .reporter {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 14px 14px 16px;
      border-radius: 2px 10px 10px 2px;
      background: rgba(0, 0, 0, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.07);
      transition: border-color 0.2s ease, background 0.2s ease;

      mat-icon {
        color: rgba(255, 255, 255, 0.35);
        font-size: 22px;
        width: 22px;
        height: 22px;
        flex-shrink: 0;
      }

      .reporter-name {
        font-family: 'DM Sans', sans-serif;
        font-weight: 700;
        min-width: 88px;
        color: rgba(255, 255, 255, 0.95);
        font-size: 14px;
      }

      .status-text {
        flex: 1;
        font-family: 'DM Sans', sans-serif;
        color: rgba(255, 255, 255, 0.55);
        font-size: 13px;
        line-height: 1.4;
      }

      &.reported {
        border-color: rgba(34, 197, 94, 0.45);
        background: rgba(34, 197, 94, 0.08);

        mat-icon {
          color: #4ade80;
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

    .phase-line {
      margin: 8px 0 0 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
    }

    .ref-appeal-hint {
      margin: 10px 0 0 0;
      font-size: 13px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.55);
    }

    .ref-dispute-actions {
      margin-top: 16px;
      padding: 16px;
      border-radius: 2px 12px 12px 2px;
      border: 1px solid rgba(248, 113, 113, 0.2);
      background: rgba(0, 0, 0, 0.25);

      p {
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.62);
        margin-bottom: 12px;
      }
    }

    .detail-match-card ::ng-deep .mat-mdc-card-content {
      padding: 0 20px 20px !important;
    }

    .detail-match-card ::ng-deep .mat-mdc-card-header {
      padding: 20px 20px 4px !important;
    }

    .detail-match-card ::ng-deep .mat-mdc-card-actions {
      padding: 16px 20px 20px !important;
      margin: 0 !important;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.35) 100%);
    }

    .detail-inset-panel ::ng-deep .mat-mdc-text-field-wrapper {
      background: rgba(0, 0, 0, 0.4);
      border-radius: 10px;
    }

    .detail-match-card ::ng-deep mat-divider.mat-divider {
      border-top-color: rgba(255, 255, 255, 0.08);
    }

    mat-card-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;

      .submit-result-btn-content {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .waiting-message {
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: 'DM Sans', sans-serif;
        color: rgba(255, 255, 255, 0.45);
        font-size: 12px;
        margin-left: auto;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          opacity: 0.7;
        }
      }
    }

    @media (max-width: 540px) {
      .detail-scoreboard.score-display {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .detail-scoreboard .score {
        order: -1;
      }

      .detail-scoreboard .player-score:first-of-type,
      .detail-scoreboard .player-score:last-of-type {
        text-align: center;
      }

      .map-result-row {
        flex-direction: column;
        align-items: stretch;
      }

      .map-result-row .map-winner-select {
        justify-content: flex-start;
      }
    }
  `]
})
export class ChallengeDetailComponent implements OnInit {
  match: Match | null = null;
  mapResults: ('challenger' | 'challengee' | null)[] = [];
  /** Challenger edits while PENDING */
  pendingMapDrafts: string[] = [];
  mapOptions: string[] = [];
  loading = true;
  submitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private challengesService: ChallengesService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private clipboard: Clipboard,
    private leaderboardsService: LeaderboardsService,
    private gamesService: GamesService,
  ) {}

  /** Profile uses `id`; JWT fallback may only set `userId` — both must work for participant checks. */
  get currentUserId(): string | null {
    const u = this.authService.currentUser();
    if (!u) return null;
    const v = u as User & { userId?: string };
    const raw = v.id ?? v.userId;
    return raw != null && String(raw) !== '' ? String(raw) : null;
  }

  get isChallenger(): boolean {
    if (!this.match || !this.currentUserId) return false;
    return String(this.match.challengerId) === String(this.currentUserId);
  }

  get isOpenMatchPending(): boolean {
    return !!this.match && this.match.status === 'PENDING' && this.match.challengeeId == null;
  }

  firstMapHeroUrl(): string {
    if (!this.match?.selectedMaps?.length) return '';
    return mapImageUrl(this.match.leaderboard.game.name, this.match.selectedMaps[0]);
  }

  get canReport(): boolean {
    if (!this.match) return false;
    if (
      (this.match.type === 'XP' || this.match.type === 'RANKED') &&
      this.match.disputePhase === 'AWAITING_ADMIN'
    ) {
      return false;
    }
    const uid = this.currentUserId;
    return (
      (this.match.status === 'ACCEPTED' || this.match.status === 'DISPUTED') &&
      !!uid &&
      (String(this.match.challengerId) === uid || String(this.match.challengeeId) === uid)
    );
  }

  get canDisputeRefDecision(): boolean {
    if (!this.match || !this.currentUserId) return false;
    const m = this.match;
    if ((m.type !== 'XP' && m.type !== 'RANKED') || m.status !== 'COMPLETED') {
      return false;
    }
    if (m.adminResolvedByUserId || m.disputePhase === 'AWAITING_ADMIN') {
      return false;
    }
    const refRulingAppealable =
      m.disputePhase === 'REF_DECIDED' ||
      (m.disputePhase === 'FINAL' && !!m.refResolvedByUserId && !m.adminResolvedByUserId);
    if (!refRulingAppealable) {
      return false;
    }
    const uid = this.currentUserId;
    return !!uid && (String(m.challengerId) === uid || String(m.challengeeId) === uid);
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
      return this.match.challengee?.username ?? null;
    }
    return null;
  }

  get pendingMapDraftsValid(): boolean {
    if (!this.match) return false;
    return (
      this.pendingMapDrafts.length === this.match.bestOf &&
      this.pendingMapDrafts.every((m) => !!m && String(m).trim().length > 0)
    );
  }

  get calculatedWinnerId(): string | null {
    if (!this.match) return null;
    const winsNeeded = Math.ceil(this.match.bestOf / 2);
    if (this.challengerWins >= winsNeeded) {
      return this.match.challengerId;
    }
    if (this.challengeeWins >= winsNeeded) {
      return this.match.challengeeId ?? null;
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
        this.pendingMapDrafts = [...(match.selectedMaps || [])];
        const uid = this.authService.currentUser()?.id;
        if (match.status === 'PENDING' && uid === match.challengerId && match.challengeeId) {
          this.gamesService.getMapsByGame(match.leaderboard.game.name).subscribe({
            next: (maps) => {
              this.mapOptions = ['Random', ...maps.map((x) => x.mapName)];
            },
            error: () => {
              this.mapOptions = ['Random'];
            },
          });
        } else {
          this.mapOptions = [];
        }

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

  disputeRefDecision(): void {
    if (!this.match) return;
    this.submitting = true;
    this.challengesService.disputeRefDecision(this.match.id).subscribe({
      next: (updated) => {
        this.match = updated;
        this.submitting = false;
        this.snackBar.open('Escalated to admin review.', 'Close', { duration: 4000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to escalate', 'Close', { duration: 4000 });
        this.submitting = false;
      },
    });
  }

  getReportedWinnerName(winnerId: string): string {
    if (!this.match) return '';
    if (winnerId === this.match.challengerId) {
      return this.match.challenger.username;
    }
    return this.match.challengee?.username ?? '';
  }

  savePendingMaps(): void {
    if (!this.match || !this.pendingMapDraftsValid) return;
    this.submitting = true;
    this.challengesService
      .updatePendingMatch(this.match.id, {
        bestOf: this.match.bestOf,
        selectedMaps: [...this.pendingMapDrafts],
      })
      .subscribe({
        next: (m) => {
          this.match = m;
          this.pendingMapDrafts = [...(m.selectedMaps || [])];
          this.mapResults = new Array(m.selectedMaps.length).fill(null);
          this.submitting = false;
          this.snackBar.open('Maps updated', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to update maps', 'Close', { duration: 4000 });
          this.submitting = false;
        },
      });
  }

  cancelPendingChallenge(): void {
    if (!this.match) return;
    this.submitting = true;
    this.challengesService.cancelChallenge(this.match.id).subscribe({
      next: (m) => {
        this.match = m;
        this.submitting = false;
        this.snackBar.open('Challenge cancelled', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to cancel', 'Close', { duration: 3000 });
        this.submitting = false;
      },
    });
  }

  cancelOpenListing(): void {
    if (!this.match) return;
    this.submitting = true;
    this.challengesService.cancelChallenge(this.match.id).subscribe({
      next: (m) => {
        this.match = m;
        this.submitting = false;
        this.snackBar.open('Listing cancelled', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to cancel', 'Close', { duration: 3000 });
        this.submitting = false;
      },
    });
  }

  acceptOpenListing(): void {
    if (!this.match) return;
    this.submitting = true;
    const accept = () => {
      this.challengesService.acceptChallenge(this.match!.id).subscribe({
        next: (m) => {
          this.match = m;
          this.mapResults = new Array(m.selectedMaps.length).fill(null);
          this.submitting = false;
          this.snackBar.open('Match accepted!', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to accept', 'Close', { duration: 4000 });
          this.submitting = false;
        },
      });
    };
    this.leaderboardsService.getMyEntry(this.match.leaderboardId).subscribe({
      next: (r) => {
        const ok = r.entry?.xpOptIn && r.entry.elo != null;
        if (ok) {
          accept();
        } else {
          this.leaderboardsService.xpJoin(this.match!.leaderboardId).subscribe({
            next: () => accept(),
            error: (err) => {
              this.snackBar.open(err.error?.message || 'Join the XP ladder first', 'Close', { duration: 4000 });
              this.submitting = false;
            },
          });
        }
      },
      error: () => {
        this.submitting = false;
      },
    });
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

    const mapResultsPayload = this.match.selectedMaps.map((mapName, i) => ({
      mapName,
      winner: this.mapResults[i] as 'challenger' | 'challengee',
    }));

    this.challengesService.reportResult(this.match.id, this.calculatedWinnerId, mapResultsPayload).subscribe({
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
