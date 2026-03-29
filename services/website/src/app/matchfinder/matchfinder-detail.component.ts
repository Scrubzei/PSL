import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../auth/auth.service';
import { AuthModalComponent } from '../auth/auth-modal/auth-modal.component';
import { MatchfinderService } from './matchfinder.service';
import { ChallengesService, Match } from '../challenges/challenges.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-matchfinder-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-wrapper">
      <!-- Hero Banner -->
      <div class="hero-banner" [style.background-image]="'url(assets/games/' + game + '.webp)'">
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
          @if (isLoggedIn) {
            <button
              class="tab"
              [class.active]="activeTab === 'matches'"
              (click)="switchTab('matches')">
              <span class="tab-title">
                My Matches
                @if (myMatches.length > 0) {
                  <span class="tab-count">{{ myMatches.length }}</span>
                }
              </span>
              <span class="tab-desc">Your active matches</span>
            </button>
          }
          <button
            class="tab tab-locked"
            (mouseenter)="showCashTooltip = true"
            (mouseleave)="showCashTooltip = false">
            <span class="tab-title">
              <svg class="lock-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
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
          <a [routerLink]="['/rules']" [queryParams]="{ game: gameSlugForRules }" class="quick-link">
            <i class="fa-solid fa-gavel"></i>
            Rules
          </a>
          <a [routerLink]="['/leaderboards', game, platform]" class="quick-link">
            <i class="fa-solid fa-chart-simple"></i>
            Leaderboard
          </a>
        </div>

        <!-- My Matches -->
        @if (activeTab === 'matches') {
          @if (myMatchesLoading) {
            <div class="empty-state">
              <p>Loading matches...</p>
            </div>
          }

          @if (!myMatchesLoading && myMatches.length === 0) {
            <div class="empty-state">
              <i class="fa-solid fa-inbox empty-icon"></i>
              <p>No active matches for this game.</p>
              <span class="empty-hint">No ranked matches in progress.</span>
            </div>
          }

          @if (!myMatchesLoading && myMatches.length > 0) {
            <div class="listings">
              @for (match of myMatches; track match.id) {
                <div class="listing-card match-card" (click)="openMatch(match.id)">
                  <div class="map-strip">
                    @for (map of match.selectedMaps; track $index) {
                      <div class="map-thumb" [style.background-image]="'url(' + getMapImage(map) + ')'">
                        <div class="map-overlay"></div>
                        <span class="map-name">{{ map }}</span>
                        @if (match.bestOf > 1) {
                          <span class="map-game-num">G{{ $index + 1 }}</span>
                        }
                      </div>
                    }
                  </div>
                  <div class="listing-body">
                    <div class="listing-left">
                      <div class="listing-player">
                        <span class="player-name">vs {{ getOpponentName(match) }}</span>
                      </div>
                      <div class="listing-meta">
                        <span class="meta-tag bo-tag">Bo{{ match.bestOf }}</span>
                        <span class="meta-tag xp-tag">
                          <i class="fa-solid fa-bolt"></i>
                          {{ match.type }}
                        </span>
                        <span class="meta-tag status-tag" [ngClass]="'status-' + match.status.toLowerCase()">
                          {{ getStatusLabel(match) }}
                        </span>
                        <span class="meta-time">{{ getTimeAgo(match.updatedAt) }}</span>
                      </div>
                    </div>
                    <div class="listing-actions">
                      @if (match.status === 'PENDING' && match.challengeeId === currentUserId) {
                        <span class="action-hint pending-hint">
                          <i class="fa-solid fa-clock"></i>
                          Respond
                        </span>
                      } @else if (match.status === 'ACCEPTED') {
                        <span class="action-hint report-hint">
                          <i class="fa-solid fa-flag"></i>
                          Report Score
                        </span>
                      } @else if (match.status === 'DISPUTED') {
                        <span class="action-hint dispute-hint">
                          <i class="fa-solid fa-triangle-exclamation"></i>
                          Disputed
                        </span>
                      } @else if (match.status === 'COMPLETED') {
                        <span class="action-hint" [class.won]="match.winnerId === currentUserId" [class.lost]="match.winnerId !== currentUserId">
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
  styles: [`
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
        border-bottom-color: #2563EB;

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

    /* Map thumbnails */
    .map-strip {
      display: flex;
      height: 140px;
      gap: 2px;
      padding: 10px 10px 0;
    }

    .map-thumb {
      flex: 1;
      position: relative;
      background-size: cover;
      background-position: center;
      overflow: hidden;
      border-radius: 8px;
      min-width: 0;
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

    .map-game-num {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 10px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.6);
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.5px;
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
      background: #2563EB;
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

    .status-declined, .status-cancelled {
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

      .map-strip {
        height: 100px;
        padding: 8px 8px 0;
      }

      .map-thumb {
        border-radius: 6px;
      }

      .map-name {
        font-size: 10px;
        bottom: 6px;
        left: 8px;
      }

      .map-game-num {
        font-size: 9px;
        top: 6px;
        right: 6px;
        padding: 1px 5px;
      }

      .listing-body {
        padding: 12px 14px;
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .listing-actions {
        display: flex;

        .accept-btn, .cancel-btn {
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
  `]
})
export class MatchfinderDetailComponent implements OnInit {
  game = '';
  platform = '';
  activeTab: 'matches' | 'cash' = 'matches';
  showCashTooltip = false;
  myMatches: Match[] = [];
  myMatchesLoading = false;
  myMatchesLoaded = false;
  currentUserId = '';
  isLoggedIn = false;
  isProd = environment.production;

  private gameNames: Record<string, string> = {
    'mw2': 'Modern Warfare 2',
    'bo2': 'Black Ops 2',
    'mw 2019': 'MW 2019'
  };

  private platformIcons: Record<string, string> = {
    'plutonium': 'fa-solid fa-desktop',
    'iw4x': 'fa-solid fa-desktop',
    'xbox': 'fa-brands fa-xbox',
    'ps3': 'fa-brands fa-playstation',
    'cross-platform': 'fa-solid fa-globe'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService,
    private matchfinderService: MatchfinderService,
    private challengesService: ChallengesService,
  ) {}

  ngOnInit(): void {
    this.game = this.route.snapshot.paramMap.get('game') || '';
    this.platform = this.route.snapshot.paramMap.get('platform') || '';
    const user = this.authService.currentUser();
    if (user) {
      this.currentUserId = user.id;
      this.isLoggedIn = true;
    }
    if (this.isLoggedIn) {
      this.loadMyMatches();
    }
  }

  loadMyMatches(): void {
    this.myMatchesLoading = true;
    this.challengesService.getMyChallenges().subscribe({
      next: (matches) => {
        const routeGame = this.game.toLowerCase();
        const routePlatform = this.platform.toLowerCase();
        this.myMatches = matches.filter(m => {
          const matchGame = m.leaderboard?.game?.name?.toLowerCase() || '';
          const matchPlatform = m.leaderboard?.platform?.name?.toLowerCase() || '';
          return matchGame === routeGame && matchPlatform === routePlatform
            && m.status !== 'SEARCHING' && m.status !== 'CANCELLED' && m.status !== 'DECLINED';
        });
        this.myMatchesLoading = false;
        this.myMatchesLoaded = true;
      },
      error: () => {
        this.myMatchesLoading = false;
        this.myMatchesLoaded = true;
      },
    });
  }

  switchTab(tab: 'matches' | 'cash'): void {
    this.activeTab = tab;
  }

  get gameName(): string {
    return this.gameNames[this.game] || this.game;
  }

  get gameSlugForRules(): string {
    const map: Record<string, string> = { 'mw2': 'mw2', 'bo2': 'bo2', 'mw 2019': 'mw2019' };
    return map[this.game] || this.game;
  }

  get platformIcon(): string {
    return this.platformIcons[this.platform] || 'fa-solid fa-globe';
  }

  getOpponentName(match: Match): string {
    if (match.challengerId === this.currentUserId) {
      return match.challengee?.username || 'TBD';
    }
    return match.challenger?.username || 'Unknown';
  }

  getStatusLabel(match: Match): string {
    const labels: Record<string, string> = {
      'PENDING': match.challengeeId === this.currentUserId ? 'Action Needed' : 'Pending',
      'ACCEPTED': 'In Progress',
      'DISPUTED': 'Disputed',
      'COMPLETED': 'Completed',
      'DECLINED': 'Declined',
      'CANCELLED': 'Cancelled',
    };
    return labels[match.status] || match.status;
  }

  openMatch(matchId: string): void {
    this.router.navigate(['/challenges', matchId]);
  }

  getMapImage(mapName: string): string {
    const slug = mapName.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
    return `assets/maps/${slug}.webp`;
  }

  getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }

}
