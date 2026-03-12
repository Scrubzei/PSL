import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

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
          <button
            class="tab"
            [class.active]="activeTab === 'xp'"
            (click)="activeTab = 'xp'">
            <span class="tab-title">XP Matches</span>
            <span class="tab-desc">Earn XP with every win</span>
          </button>
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

        <p class="empty-state">No players are currently looking for a match.</p>
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
      margin: 0;
      font-size: 15px;
      color: rgba(255, 255, 255, 0.25);
      text-align: center;
      padding: 60px 0;
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
    }
  `]
})
export class MatchfinderDetailComponent implements OnInit {
  game = '';
  platform = '';
  activeTab: 'xp' | 'cash' = 'xp';
  showCashTooltip = false;

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

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.game = this.route.snapshot.paramMap.get('game') || '';
    this.platform = this.route.snapshot.paramMap.get('platform') || '';
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
}
