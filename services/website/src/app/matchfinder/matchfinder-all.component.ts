import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ChallengesService, Match } from '../challenges/challenges.service';
import { mapImageUrl } from '../games/map-assets';

/** Same slugs as matchfinder home for resolving feed links to /matchfinder/:game/:platform */
const GAME_SLUGS: { name: string; slug: string }[] = [
  { name: 'Modern Warfare 2', slug: 'mw2' },
  { name: 'Black Ops 2', slug: 'bo2' },
  { name: 'MW 2019', slug: 'mw 2019' },
];

@Component({
  selector: 'app-matchfinder-all',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-wrapper">
      <div class="bg-decoration">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="grid-lines"></div>
      </div>

      <div class="inner">
        <a routerLink="/matchfinder" class="back-link">&larr; Matchfinder</a>

        <header class="hero">
          <p class="kicker">Cross-game</p>
          <h1>All matches</h1>
          <p class="sub">Pending and in-progress listings across every title and platform.</p>
        </header>

        @if (feedLoading) {
          <p class="feed-loading">Loading…</p>
        } @else if (feedMatches.length === 0) {
          <p class="feed-empty">No active matches right now.</p>
        } @else {
          <div class="feed-list">
            @for (m of feedMatches; track m.id) {
              <div class="feed-card" (click)="goToMatchGame(m)">
                @if (m.selectedMaps.length > 0) {
                  <div
                    class="feed-map-header"
                    [style.background-image]="'url(' + getMapImage(m, m.selectedMaps[0]) + ')'">
                    <div class="feed-map-overlay"></div>
                    <span class="feed-map-label">{{ m.selectedMaps[0] }}</span>
                  </div>
                }
                <div class="feed-body">
                  @if (m.selectedMaps.length > 1) {
                    <div class="feed-map-chips">
                      @for (map of m.selectedMaps; track $index) {
                        <span class="feed-map-chip">{{ map }}</span>
                      }
                    </div>
                  }
                  <div class="feed-kicker">{{ m.leaderboard.game.name }} · {{ m.leaderboard.platform.name }}</div>
                  <div class="feed-players">
                    {{ m.challenger.username }}
                    <span class="feed-vs">vs</span>
                    {{ m.challengee?.username ?? 'Open listing' }}
                  </div>
                  <div class="feed-meta">
                    <span class="feed-pill type">{{ m.type }}</span>
                    <span class="feed-pill status">{{ m.status }}</span>
                  </div>
                  <button
                    type="button"
                    class="feed-cta"
                    (click)="goToMatchGame(m); $event.stopPropagation()">
                    Open in Matchfinder
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      position: relative;
      background: #0a0a0f;
      min-height: 100%;
    }

    .bg-decoration {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }

    .gradient-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.28;
      &.orb-1 {
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(37, 99, 235, 0.35) 0%, transparent 70%);
        top: -150px;
        right: -100px;
      }
      &.orb-2 {
        width: 350px;
        height: 350px;
        background: radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%);
        bottom: -100px;
        left: -100px;
      }
    }

    .grid-lines {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 80px 80px;
      mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%);
    }

    .inner {
      position: relative;
      z-index: 1;
      max-width: 880px;
      margin: 0 auto;
      padding: 28px 24px 56px;
    }

    .back-link {
      display: inline-block;
      margin-bottom: 24px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.55);
      text-decoration: none;
      transition: color 0.2s ease;
      &:hover {
        color: var(--theme-primary-bright, #93c5fd);
      }
    }

    .hero {
      margin-bottom: 28px;
    }

    .kicker {
      margin: 0 0 6px 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.38);
    }

    .hero h1 {
      margin: 0 0 10px 0;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 700;
      color: white;
      letter-spacing: -0.02em;
    }

    .sub {
      margin: 0;
      font-size: 15px;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.45);
      max-width: 520px;
    }

    .feed-loading,
    .feed-empty {
      color: rgba(255, 255, 255, 0.45);
      font-size: 14px;
      padding: 16px 0;
    }

    .feed-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .feed-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 280px);
      gap: 0;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.35);
      cursor: pointer;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      &:hover {
        border-color: rgba(var(--theme-primary-rgb, 37, 99, 235), 0.45);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      }
    }

    .feed-map-header {
      min-height: 100px;
      background-size: cover;
      background-position: center;
      position: relative;
      display: flex;
      align-items: flex-end;
      padding: 8px;
    }

    .feed-map-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 4px;
    }

    .feed-map-chip {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 3px 7px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .feed-map-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 30%, rgba(0, 0, 0, 0.85));
    }

    .feed-map-label {
      position: relative;
      z-index: 1;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .feed-body {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      justify-content: center;
      border-left: 1px solid rgba(255, 255, 255, 0.06);
    }

    .feed-kicker {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255, 255, 255, 0.45);
    }

    .feed-players {
      font-size: 15px;
      font-weight: 600;
      color: white;
      line-height: 1.3;
    }

    .feed-vs {
      font-weight: 500;
      color: rgba(255, 255, 255, 0.35);
      margin: 0 6px;
      font-size: 13px;
    }

    .feed-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .feed-pill {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 4px 10px;
      border-radius: 100px;
      background: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.75);
    }

    .feed-pill.type {
      color: #93c5fd;
      border: 1px solid rgba(147, 197, 253, 0.25);
    }

    .feed-pill.status {
      color: #fcd34d;
      border: 1px solid rgba(252, 211, 77, 0.25);
    }

    .feed-cta {
      margin-top: 6px;
      align-self: flex-start;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid rgba(var(--theme-primary-rgb, 37, 99, 235), 0.5);
      background: rgba(var(--theme-primary-rgb, 37, 99, 235), 0.15);
      color: var(--theme-primary-bright, #93c5fd);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s ease;
      &:hover {
        background: rgba(var(--theme-primary-rgb, 37, 99, 235), 0.28);
      }
    }

    @media (max-width: 720px) {
      .feed-card {
        grid-template-columns: 1fr;
      }
      .feed-body {
        border-left: none;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }
    }
  `],
})
export class MatchfinderAllComponent implements OnInit {
  feedMatches: Match[] = [];
  feedLoading = true;

  constructor(
    private router: Router,
    private challengesService: ChallengesService,
  ) {}

  ngOnInit(): void {
    this.challengesService.getPublicFeed({ limit: 40, statuses: 'PENDING,ACCEPTED' }).subscribe({
      next: (list) => {
        this.feedMatches = list;
        this.feedLoading = false;
      },
      error: () => {
        this.feedLoading = false;
      },
    });
  }

  getMapImage(m: Match, mapName: string): string {
    return mapImageUrl(m.leaderboard.game.name, mapName);
  }

  goToMatchGame(m: Match): void {
    const g = GAME_SLUGS.find((x) => x.name === m.leaderboard.game.name);
    const gameSlug = g?.slug ?? m.leaderboard.game.name.toLowerCase().replace(/\s+/g, '-');
    const platSlug = m.leaderboard.platform.name.toLowerCase().replace(/\s+/g, '-');
    this.router.navigate(['/matchfinder', gameSlug, platSlug], {
      queryParams: { tab: 'browse' },
    });
  }
}
