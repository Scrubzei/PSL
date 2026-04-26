import { Component, OnInit, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { AuthService } from "../auth/auth.service";
import { AuthModalComponent } from "../auth/auth-modal/auth-modal.component";
import { MatchfinderService } from "./matchfinder.service";
import { MatchfinderOpenDialogComponent } from "./matchfinder-open-dialog.component";
import { ChallengesService, Match } from "../challenges/challenges.service";
import {
  LeaderboardsService,
  LeaderboardEntry,
} from "../leaderboard/leaderboards.service";
import { environment } from "../../environments/environment";
import { mapImageUrl } from "../games/map-assets";

@Component({
  selector: "app-matchfinder-detail",
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="page-wrapper">
      <!-- Hero Banner -->
      <div
        class="hero-banner"
        [style.background-image]="'url(assets/games/' + game + '.webp)'"
      >
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <a routerLink="/matchfinder" class="back-link">&larr; Back</a>
          <div class="hero-title">
            <h1>{{ gameName }}</h1>
            <i [class]="platformIcon" class="platform-icon-hero"></i>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-bar">
        <div class="tabs-inner">
          <button
            class="tab"
            [class.active]="activeTab === 'browse'"
            (click)="switchTab('browse')"
          >
            <span class="tab-title">Browse</span>
            <span class="tab-desc">Open XP listings</span>
          </button>
          @if (isLoggedIn) {
            <button
              class="tab"
              [class.active]="activeTab === 'matches'"
              (click)="switchTab('matches')"
            >
              <span class="tab-title">
                My Matches
                @if (myMatches.length > 0) {
                  <span class="tab-count">{{ myMatches.length }}</span>
                }
              </span>
              <span class="tab-desc">Posted or accepted</span>
            </button>
          }
          <button
            class="tab tab-locked"
            (mouseenter)="showCashTooltip = true"
            (mouseleave)="showCashTooltip = false"
          >
            <span class="tab-title">
              <svg class="lock-icon" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"
                />
              </svg>
              Cash Matches
            </span>
            <span class="tab-desc">Wager and win real money</span>
            @if (showCashTooltip) {
              <span class="tooltip">Coming soon</span>
            }
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="content">
        <div class="quick-links">
          <a
            [routerLink]="['/rules']"
            [queryParams]="{ game: gameSlugForRules }"
            class="quick-link"
          >
            <i class="fa-solid fa-gavel"></i>
            Rules
          </a>
          <a
            [routerLink]="['/leaderboards', game, platform]"
            class="quick-link"
          >
            <i class="fa-solid fa-chart-simple"></i>
            Leaderboard
          </a>
        </div>

        @if (boardLoading) {
          <div class="empty-state">
            <p>Loading…</p>
          </div>
        }

        @if (!boardLoading && leaderboardId && isLoggedIn && !canPlayXp) {
          <div class="xp-join-banner">
            <div class="xp-join-text">
              <i class="fa-solid fa-bolt"></i>
              <span
                >Join the XP ladder on this leaderboard to post or accept open
                matches.</span
              >
            </div>
            <button
              mat-flat-button
              color="primary"
              class="xp-join-btn"
              (click)="joinXpLadder()"
            >
              Join XP ladder
            </button>
          </div>
        }

        <!-- Browse open listings -->
        @if (!boardLoading && activeTab === "browse") {
          @if (!isLoggedIn) {
            <div class="empty-state">
              <i class="fa-solid fa-right-to-bracket empty-icon"></i>
              <p>Sign in to browse open XP matches and accept listings.</p>
              <button
                mat-flat-button
                color="primary"
                class="sign-in-cta"
                (click)="openSignIn()"
              >
                Sign in
              </button>
            </div>
          } @else if (browseLoading) {
            <div class="empty-state">
              <p>Loading listings…</p>
            </div>
          } @else {
            <div class="browse-toolbar">
              <button
                mat-flat-button
                color="primary"
                class="create-open-btn"
                (click)="openCreateOpenDialog()"
                [disabled]="!canPlayXp"
              >
                <i class="fa-solid fa-plus"></i>
                Post open match
              </button>
              @if (!canPlayXp) {
                <span class="toolbar-hint"
                  >Join the XP ladder above to post.</span
                >
              }
            </div>

            @if (openMatches.length === 0) {
              <div class="empty-state">
                <i class="fa-solid fa-globe empty-icon"></i>
                <p>No open listings right now.</p>
                <span class="empty-hint"
                  >Be the first to post an open XP match.</span
                >
              </div>
            }

            @if (openMatches.length > 0) {
              <div class="listings">
                @for (match of openMatches; track match.id) {
                  <div
                    class="listing-card browse-card"
                    [class.own]="match.challengerId === currentUserId"
                    (click)="openMatchCard(match)"
                  >
                    @if (match.selectedMaps.length > 0) {
                      <div
                        class="map-header"
                        [style.background-image]="
                          'url(' + getMapImage(match.selectedMaps[0]) + ')'
                        "
                      >
                        <div class="map-overlay"></div>
                        <span class="map-name">{{
                          match.selectedMaps[0]
                        }}</span>
                      </div>
                    }
                    <div class="listing-body">
                      <div class="listing-left">
                        @if (match.selectedMaps.length > 1) {
                          <div class="map-chips">
                            @for (map of match.selectedMaps; track $index) {
                              <span class="map-chip">{{ map }}</span>
                            }
                          </div>
                        }
                        <div class="listing-player">
                          <span class="player-name">{{
                            match.challenger.username
                          }}</span>
                          <span class="open-badge">Open listing</span>
                        </div>
                        <div class="listing-meta">
                          <span class="meta-tag bo-tag"
                            >Bo{{ match.bestOf }}</span
                          >
                          <span class="meta-tag xp-tag">
                            <i class="fa-solid fa-bolt"></i>
                            XP
                          </span>
                          <span class="meta-time">{{
                            getTimeAgo(match.createdAt)
                          }}</span>
                        </div>
                      </div>
                      <div
                        class="listing-actions"
                        (click)="$event.stopPropagation()"
                      >
                        @if (match.challengerId === currentUserId) {
                          <span class="action-hint own-hint">
                            <i class="fa-solid fa-user"></i>
                            Yours
                          </span>
                        } @else if (canPlayXp) {
                          <button
                            mat-flat-button
                            color="primary"
                            class="accept-inline-btn"
                            (click)="acceptOpenMatch(match, $event)"
                          >
                            Accept
                          </button>
                        } @else {
                          <span class="action-hint muted-hint"
                            >Join XP to accept</span
                          >
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          }
        }

        <!-- My Matches -->
        @if (!boardLoading && activeTab === "matches" && isLoggedIn) {
          @if (myMatchesLoading) {
            <div class="empty-state">
              <p>Loading matches...</p>
            </div>
          }

          @if (!myMatchesLoading && myMatches.length === 0) {
            <div class="empty-state">
              <i class="fa-solid fa-inbox empty-icon"></i>
              <p>No XP matches for this game yet.</p>
              <span class="empty-hint"
                >Post an open match from Browse or challenge someone from the
                leaderboard.</span
              >
            </div>
          }

          @if (!myMatchesLoading && myMatches.length > 0) {
            <div class="listings">
              @for (match of myMatches; track match.id) {
                <div
                  class="listing-card match-card"
                  (click)="openMatchCard(match)"
                >
                  @if (match.selectedMaps.length > 0) {
                    <div
                      class="map-header"
                      [style.background-image]="
                        'url(' + getMapImage(match.selectedMaps[0]) + ')'
                      "
                    >
                      <div class="map-overlay"></div>
                      <span class="map-name">{{ match.selectedMaps[0] }}</span>
                    </div>
                  }
                  <div class="listing-body">
                    <div class="listing-left">
                      @if (match.selectedMaps.length > 1) {
                        <div class="map-chips">
                          @for (map of match.selectedMaps; track $index) {
                            <span class="map-chip">{{ map }}</span>
                          }
                        </div>
                      }
                      <div class="listing-player">
                        <span class="player-name"
                          >vs {{ getOpponentName(match) }}</span
                        >
                      </div>
                      <div class="listing-meta">
                        <span class="meta-tag bo-tag"
                          >Bo{{ match.bestOf }}</span
                        >
                        <span class="meta-tag xp-tag">
                          <i class="fa-solid fa-bolt"></i>
                          {{ match.type }}
                        </span>
                        <span
                          class="meta-tag status-tag"
                          [ngClass]="'status-' + match.status.toLowerCase()"
                        >
                          {{ getStatusLabel(match) }}
                        </span>
                        <span class="meta-time">{{
                          getTimeAgo(match.updatedAt)
                        }}</span>
                      </div>
                    </div>
                    <div class="listing-actions">
                      @if (
                        match.status === "PENDING" &&
                        !match.challengeeId &&
                        match.challengerId === currentUserId
                      ) {
                        <span class="action-hint own-hint">
                          <i class="fa-solid fa-bullhorn"></i>
                          Open listing
                        </span>
                      } @else if (
                        match.status === "PENDING" &&
                        match.challengeeId === currentUserId
                      ) {
                        <span class="action-hint pending-hint">
                          <i class="fa-solid fa-clock"></i>
                          Respond
                        </span>
                      } @else if (match.status === "ACCEPTED") {
                        <span class="action-hint report-hint">
                          <i class="fa-solid fa-flag"></i>
                          Report Score
                        </span>
                      } @else if (match.status === "DISPUTED") {
                        <span class="action-hint dispute-hint">
                          <i class="fa-solid fa-triangle-exclamation"></i>
                          Disputed
                        </span>
                      } @else if (match.status === "COMPLETED") {
                        <span
                          class="action-hint"
                          [class.won]="match.winnerId === currentUserId"
                          [class.lost]="match.winnerId !== currentUserId"
                        >
                          @if (match.winnerId === currentUserId) {
                            <i class="fa-solid fa-trophy"></i> Won
                          } @else {
                            <i class="fa-solid fa-minus"></i> Lost
                          }
                        </span>
                      } @else {
                        <i class="fa-solid fa-chevron-right match-arrow"></i>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .page-wrapper {
        background: #0a0a0f;
        min-height: 100%;
      }

      /* Hero Banner */
      .hero-banner {
        position: relative;
        height: 240px;
        background-size: cover;
        background-position: center top;
      }

      .hero-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          rgba(20, 40, 120, 0.7) 0%,
          rgba(10, 15, 40, 0.85) 50%,
          rgba(10, 10, 15, 1) 100%
        );
      }

      .hero-content {
        position: relative;
        z-index: 1;
        max-width: 900px;
        margin: 0 auto;
        padding: 24px 24px 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .back-link {
        color: rgba(255, 255, 255, 0.5);
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        transition: color 0.2s ease;
        align-self: flex-start;

        &:hover {
          color: white;
        }
      }

      .hero-title {
        display: flex;
        align-items: center;
        gap: 16px;
        padding-bottom: 24px;

        h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          color: white;
        }

        .platform-icon-hero {
          font-size: 28px;
          color: rgba(255, 255, 255, 0.5);
        }
      }

      /* Tabs */
      .tabs-bar {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .tabs-inner {
        max-width: 900px;
        margin: 0 auto;
        padding: 0 24px;
        display: flex;
        gap: 0;
      }

      .tab {
        flex: 1;
        padding: 20px 24px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .tab-title {
          font-size: 15px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s ease;
        }

        .tab-desc {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.2);
          transition: color 0.2s ease;
        }

        &:hover .tab-title {
          color: rgba(255, 255, 255, 0.6);
        }

        &.active {
          border-bottom-color: #2563eb;

          .tab-title {
            color: white;
          }

          .tab-desc {
            color: rgba(255, 255, 255, 0.4);
          }
        }

        &.tab-locked {
          cursor: default;
          position: relative;

          .tab-title {
            color: rgba(255, 255, 255, 0.15);
          }

          .tab-desc {
            color: rgba(255, 255, 255, 0.08);
          }

          .lock-icon {
            width: 14px;
            height: 14px;
          }

          &:hover .tab-title {
            color: rgba(255, 255, 255, 0.2);
          }

          &:hover .tab-desc {
            color: rgba(255, 255, 255, 0.1);
          }
        }

        .tooltip {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%) translateY(-100%);
          padding: 6px 14px;
          background: #1a1a24;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          letter-spacing: 0;
          text-transform: none;
          pointer-events: none;
        }
      }

      /* Content */
      .content {
        max-width: 900px;
        margin: 0 auto;
        padding: 40px 24px;
      }

      .quick-links {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 20px;
        margin-bottom: 32px;
      }

      .quick-link {
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(255, 255, 255, 0.4);
        text-decoration: none;
        font-size: 13px;
        font-weight: 600;
        transition: color 0.2s ease;

        i {
          font-size: 14px;
        }

        &:hover {
          color: white;
        }
      }

      .xp-join-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
        padding: 16px 20px;
        margin-bottom: 28px;
        background: rgba(37, 99, 235, 0.08);
        border: 1px solid rgba(37, 99, 235, 0.25);
        border-radius: 12px;

        .xp-join-text {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.85);

          i {
            color: #60a5fa;
          }
        }

        .xp-join-btn {
          font-weight: 600;
        }
      }

      .browse-toolbar {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
        flex-wrap: wrap;

        .create-open-btn i {
          margin-right: 8px;
        }

        .toolbar-hint {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.35);
        }
      }

      .sign-in-cta {
        margin-top: 8px;
      }

      .browse-card.own {
        border-color: rgba(37, 99, 235, 0.35);
        background: rgba(37, 99, 235, 0.04);
      }

      .open-badge {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 2px 8px;
        border-radius: 6px;
        background: rgba(52, 211, 153, 0.12);
        color: #6ee7b7;
        margin-left: 8px;
      }

      .own-hint {
        color: #93c5fd !important;
        background: rgba(37, 99, 235, 0.12) !important;
        border: 1px solid rgba(37, 99, 235, 0.25) !important;
      }

      .muted-hint {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.35) !important;
        background: transparent !important;
        border: none !important;
      }

      .accept-inline-btn {
        font-size: 13px;
        font-weight: 600;
      }

      .empty-state {
        text-align: center;
        padding: 80px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;

        .empty-icon {
          font-size: 40px;
          color: rgba(255, 255, 255, 0.08);
        }

        p {
          margin: 0;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.3);
        }

        .empty-hint {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.15);
        }
      }

      .listings {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .listing-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 14px;
        overflow: hidden;
        transition: all 0.25s ease;

        &:hover {
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transform: translateY(-2px);
        }

        &.own {
          border-color: rgba(37, 99, 235, 0.2);
          background: rgba(37, 99, 235, 0.03);
        }
      }

      /* First-map header */
      .map-header {
        height: 140px;
        position: relative;
        background-size: cover;
        background-position: center;
        margin: 10px 10px 0;
        border-radius: 8px;
        overflow: hidden;
      }

      .map-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 4px;
      }

      .map-chip {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 4px 8px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .map-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          transparent 30%,
          rgba(0, 0, 0, 0.7) 100%
        );
      }

      .map-name {
        position: absolute;
        bottom: 8px;
        left: 10px;
        font-size: 11px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.9);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9);
      }

      /* Listing body */
      .listing-body {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
      }

      .listing-left {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .listing-player {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .player-name {
        font-size: 15px;
        font-weight: 700;
        color: white;
      }

      .listing-meta {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .meta-tag {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 3px 8px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .bo-tag {
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.08);
      }

      .meta-time {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.2);
      }

      .listing-actions {
        flex-shrink: 0;
      }

      /* Tab count badge */
      .tab-count {
        font-size: 11px;
        font-weight: 700;
        background: #2563eb;
        color: white;
        padding: 1px 7px;
        border-radius: 10px;
        letter-spacing: 0;
        text-transform: none;
      }

      /* My Matches cards */
      .match-card {
        cursor: pointer;
      }

      .status-tag {
        font-size: 10px;
        padding: 3px 8px;
        border-radius: 6px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .status-pending {
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
      }

      .status-accepted {
        color: #34d399;
        background: rgba(52, 211, 153, 0.1);
      }

      .status-disputed {
        color: #f87171;
        background: rgba(248, 113, 113, 0.1);
      }

      .status-completed {
        color: rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.05);
      }

      .status-declined,
      .status-cancelled {
        color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.03);
      }

      .action-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 10px;

        i {
          font-size: 12px;
        }
      }

      .pending-hint {
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.2);
      }

      .report-hint {
        color: #34d399;
        background: rgba(52, 211, 153, 0.1);
        border: 1px solid rgba(52, 211, 153, 0.2);
      }

      .dispute-hint {
        color: #f87171;
        background: rgba(248, 113, 113, 0.1);
        border: 1px solid rgba(248, 113, 113, 0.2);
      }

      .action-hint.won {
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.08);
      }

      .action-hint.lost {
        color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.03);
      }

      .match-arrow {
        color: rgba(255, 255, 255, 0.15);
        font-size: 14px;
      }

      /* Responsive */
      @media (max-width: 600px) {
        .hero-banner {
          height: 180px;
        }

        .hero-title h1 {
          font-size: 24px;
        }

        .tab {
          padding: 16px 16px;

          .tab-title {
            font-size: 13px;
          }

          .tab-desc {
            font-size: 11px;
          }
        }

        .map-header {
          height: 100px;
          margin: 8px 8px 0;
        }

        .map-name {
          font-size: 10px;
          bottom: 6px;
          left: 8px;
        }

        .listing-body {
          padding: 12px 14px;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }

        .listing-actions {
          display: flex;

          .accept-btn,
          .cancel-btn {
            flex: 1;
            justify-content: center;
          }
        }

        .player-name {
          font-size: 14px;
        }

        .quick-links {
          flex-wrap: wrap;
          gap: 12px;
        }
      }
    `,
  ],
})
export class MatchfinderDetailComponent implements OnInit {
  game = "";
  platform = "";
  activeTab: "browse" | "matches" = "browse";
  showCashTooltip = false;
  myMatches: Match[] = [];
  myMatchesLoading = false;
  myMatchesLoaded = false;
  openMatches: Match[] = [];
  browseLoading = false;
  boardLoading = true;
  leaderboardId: string | null = null;
  myEntry: LeaderboardEntry | null = null;
  currentUserId = "";
  isLoggedIn = false;
  isProd = environment.production;

  private gameNames: Record<string, string> = {
    mw2: "Modern Warfare 2",
    bo2: "Black Ops 2",
    "mw 2019": "MW 2019",
  };

  private platformIcons: Record<string, string> = {
    plutonium: "fa-solid fa-desktop",
    iw4x: "fa-solid fa-desktop",
    xbox: "fa-brands fa-xbox",
    ps3: "fa-brands fa-playstation",
    "cross-platform": "fa-solid fa-globe",
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService,
    private matchfinderService: MatchfinderService,
    private challengesService: ChallengesService,
    private leaderboardsService: LeaderboardsService,
    private snackBar: MatSnackBar,
  ) {
    // effect() runs in the injection context (constructor), so it is safe in Angular 18.
    // Re-evaluates whenever currentUser signal changes and triggers data loads when both
    // user and leaderboardId are available.
    effect(() => {
      const user = this.authService.currentUser();
      this.isLoggedIn = !!user;
      this.currentUserId = user?.id ?? "";
      if (user && this.leaderboardId) {
        this.loadMyEntry();
        this.loadBrowse();
        this.loadMyMatches();
      }
    });
  }

  get canPlayXp(): boolean {
    return !!this.myEntry?.xpOptIn && this.myEntry.elo != null;
  }

  ngOnInit(): void {
    this.game = this.route.snapshot.paramMap.get("game") || "";
    this.platform = this.route.snapshot.paramMap.get("platform") || "";

    const tab = this.route.snapshot.queryParamMap.get("tab");
    if (tab === "matches" || tab === "browse") {
      this.activeTab = tab;
    }

    this.boardLoading = true;
    this.matchfinderService.getLeaderboard(this.game, this.platform).subscribe({
      next: (lb) => {
        this.leaderboardId = lb.id;
        this.boardLoading = false;
        if (this.isLoggedIn) {
          this.loadMyEntry();
          this.loadBrowse();
          this.loadMyMatches();
        }
      },
      error: () => {
        this.boardLoading = false;
        this.snackBar.open(
          "Could not load leaderboard for this game/platform.",
          "Close",
          { duration: 5000 },
        );
      },
    });
  }

  loadMyEntry(): void {
    if (!this.leaderboardId) return;
    this.leaderboardsService.getMyEntry(this.leaderboardId).subscribe({
      next: (r) => {
        this.myEntry = r.entry;
      },
    });
  }

  loadBrowse(): void {
    if (!this.isLoggedIn || !this.leaderboardId) return;
    this.browseLoading = true;
    this.matchfinderService.getXpOpenList(this.leaderboardId).subscribe({
      next: (list) => {
        this.openMatches = list;
        this.browseLoading = false;
      },
      error: () => {
        this.browseLoading = false;
      },
    });
  }

  loadMyMatches(): void {
    if (!this.isLoggedIn || !this.leaderboardId) return;
    this.myMatchesLoading = true;
    this.challengesService.getMyChallenges().subscribe({
      next: (matches) => {
        this.myMatches = matches.filter(
          (m) =>
            m.type === "XP" &&
            m.leaderboardId === this.leaderboardId &&
            m.status !== "CANCELLED" &&
            m.status !== "DECLINED",
        );
        this.myMatchesLoading = false;
        this.myMatchesLoaded = true;
      },
      error: () => {
        this.myMatchesLoading = false;
        this.myMatchesLoaded = true;
      },
    });
  }

  switchTab(tab: "browse" | "matches"): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  openSignIn(): void {
    this.dialog.open(AuthModalComponent, {
      width: "400px",
      data: { message: "Sign in to use matchfinder" },
    });
  }

  joinXpLadder(): void {
    if (!this.leaderboardId) return;
    if (!this.authService.isAuthenticated()) {
      this.openSignIn();
      return;
    }
    this.leaderboardsService.xpJoin(this.leaderboardId).subscribe({
      next: (entry) => {
        this.myEntry = entry;
        this.snackBar.open("You joined the XP ladder!", "Close", {
          duration: 3000,
        });
        this.loadBrowse();
      },
      error: (err) => {
        this.snackBar.open(
          err.error?.message || "Failed to join XP ladder",
          "Close",
          { duration: 4000 },
        );
      },
    });
  }

  openCreateOpenDialog(): void {
    if (!this.leaderboardId || !this.canPlayXp) return;
    this.dialog
      .open(MatchfinderOpenDialogComponent, {
        width: "480px",
        data: {
          game: this.game,
          platform: this.platform,
          gameDisplayName: this.gameName,
        },
      })
      .afterClosed()
      .subscribe(
        (result: { bestOf: number; selectedMaps: string[] } | undefined) => {
          if (!result || !this.leaderboardId) return;
          this.challengesService
            .createOpenXpMatch({
              leaderboardId: this.leaderboardId,
              bestOf: result.bestOf,
              selectedMaps: result.selectedMaps,
            })
            .subscribe({
              next: () => {
                this.snackBar.open("Open match posted", "Close", {
                  duration: 3000,
                });
                this.loadBrowse();
                this.loadMyMatches();
              },
              error: (err) => {
                this.snackBar.open(
                  err.error?.message || "Failed to create listing",
                  "Close",
                  { duration: 5000 },
                );
              },
            });
        },
      );
  }

  acceptOpenMatch(match: Match, event: Event): void {
    event.stopPropagation();
    if (match.challengerId === this.currentUserId || !this.leaderboardId)
      return;
    const go = () => {
      this.challengesService.acceptChallenge(match.id).subscribe({
        next: (m) => {
          this.router.navigate(["/challenges", m.id]);
          this.loadBrowse();
          this.loadMyMatches();
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || "Could not accept match",
            "Close",
            { duration: 5000 },
          );
        },
      });
    };
    if (this.canPlayXp) {
      go();
    } else {
      this.leaderboardsService.xpJoin(this.leaderboardId).subscribe({
        next: (entry) => {
          this.myEntry = entry;
          go();
        },
        error: (err) => {
          this.snackBar.open(
            err.error?.message || "Join the XP ladder first",
            "Close",
            { duration: 5000 },
          );
        },
      });
    }
  }

  openMatchCard(match: Match): void {
    this.router.navigate(["/challenges", match.id]);
  }

  get gameName(): string {
    return this.gameNames[this.game] || this.game;
  }

  get gameSlugForRules(): string {
    const map: Record<string, string> = {
      mw2: "mw2",
      bo2: "bo2",
      "mw 2019": "mw2019",
    };
    return map[this.game] || this.game;
  }

  get platformIcon(): string {
    return this.platformIcons[this.platform] || "fa-solid fa-globe";
  }

  getOpponentName(match: Match): string {
    if (!match.challengeeId) {
      return "Open listing";
    }
    if (match.challengerId === this.currentUserId) {
      return match.challengee?.username || "TBD";
    }
    return match.challenger?.username || "Unknown";
  }

  getStatusLabel(match: Match): string {
    if (match.status === "PENDING" && !match.challengeeId) {
      return match.challengerId === this.currentUserId
        ? "Open listing"
        : "Open";
    }
    const labels: Record<string, string> = {
      PENDING:
        match.challengeeId === this.currentUserId ? "Action Needed" : "Pending",
      ACCEPTED: "In Progress",
      DISPUTED: "Disputed",
      COMPLETED: "Completed",
      DECLINED: "Declined",
      CANCELLED: "Cancelled",
    };
    return labels[match.status] || match.status;
  }

  getMapImage(mapName: string): string {
    return mapImageUrl(this.game, mapName);
  }

  getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }
}
