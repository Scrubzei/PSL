import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface GamePlatform {
  name: string;
  slug: string;
  color: string;
  hoverColor: string;
  icon: string;
}

interface Game {
  name: string;
  slug: string;
  image: string;
  platforms: GamePlatform[];
}

@Component({
  selector: 'app-matchfinder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-wrapper">
      <!-- Dynamic background -->
      <div
        class="bg-image"
        [class.active]="hoveredGame"
        [style.background-image]="hoveredGame ? 'url(assets/games/' + hoveredGame + '.webp)' : 'none'">
      </div>

      <div class="bg-decoration">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="grid-lines"></div>
      </div>

      <div class="matchfinder-container">
        <div class="hero">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            Find Opponents
          </div>
          <h1>Matchfinder</h1>
          <p class="subtitle">Select a game to find your opponent</p>
        </div>

        <div class="games-grid">
          @for (game of games; track game.slug) {
            <div
              class="game-card"
              [class.expanded]="selectedGame === game.slug"
              [style.animation-delay]="$index * 0.08 + 's'">

              @if (selectedGame !== game.slug) {
                <!-- Game Cover -->
                <div
                  class="card-face card-front"
                  (click)="selectGame(game.slug)"
                  (mouseenter)="hoveredGame = game.slug"
                  (mouseleave)="hoveredGame = null">
                  <div class="game-image">
                    <img [src]="game.image" [alt]="game.name" />
                    <div class="image-overlay"></div>
                  </div>
                  <div class="game-info">
                    <h3>{{ game.name }}</h3>
                    <span class="arrow">&rarr;</span>
                  </div>
                </div>
              } @else {
                <!-- Platform Selection -->
                <div class="card-face card-back">
                  <button class="back-btn" (click)="selectGame(null)">
                    <span class="back-arrow">&larr;</span>
                    {{ game.name }}
                  </button>
                  <div class="platform-list">
                    @for (platform of game.platforms; track platform.slug) {
                      <button
                        class="platform-btn"
                        [style.--btn-color]="platform.color"
                        [style.--btn-hover]="platform.hoverColor"
                        (click)="selectPlatform(game, platform)">
                        <i [class]="platform.icon" class="platform-icon"></i>
                        <span class="platform-name">{{ platform.name }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      position: relative;
      background: #0a0a0f;
      min-height: 100%;
    }

    .bg-image {
      position: fixed;
      inset: 0;
      top: 72px;
      background-size: cover;
      background-position: center;
      opacity: 0;
      transform: scale(1.05);
      transition: opacity 0.5s ease, transform 0.5s ease;
      z-index: 0;

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
      }

      &.active {
        opacity: 1;
        transform: scale(1);
      }
    }

    .bg-decoration {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 1;
    }

    .gradient-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.3;

      &.orb-1 {
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, transparent 70%);
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

    .matchfinder-container {
      position: relative;
      z-index: 2;
      padding: 48px 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Hero */
    .hero {
      text-align: center;
      margin-bottom: 56px;

      h1 {
        margin: 0 0 16px;
        font-size: 48px;
        font-weight: 700;
        color: white;
      }

      .subtitle {
        margin: 0;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 24px;

      .badge-dot {
        width: 8px;
        height: 8px;
        background: #2563EB;
        border-radius: 50%;
        animation: pulse 2s ease-in-out infinite;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5);
      }
      50% {
        opacity: 0.8;
        box-shadow: 0 0 0 8px transparent;
      }
    }

    /* Grid */
    .games-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      max-width: 750px;
      margin: 0 auto;
    }

    .game-card {
      animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      opacity: 0;
      border-radius: 16px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.3s ease;
    }

    .card-front {
      cursor: pointer;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .game-card:not(.expanded):hover {
      border-color: rgba(37, 99, 235, 0.5);
      box-shadow:
        0 20px 50px rgba(0, 0, 0, 0.5),
        0 0 40px rgba(37, 99, 235, 0.12);
      transform: translateY(-8px) scale(1.02);
    }

    .game-card:not(.expanded):hover .game-image img {
      transform: scale(1.1);
    }

    .game-card:not(.expanded):hover .image-overlay {
      opacity: 0.4;
    }

    .game-card:not(.expanded):hover .arrow {
      transform: translateX(4px);
      color: #3B82F6;
    }

    .game-card:not(.expanded):hover .game-info h3 {
      color: #3B82F6;
    }

    .game-card.expanded {
      border-color: rgba(255, 255, 255, 0.12);
    }

    /* Game image */
    .game-image {
      position: relative;
      aspect-ratio: 3 / 4;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .image-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          transparent 40%,
          rgba(10, 10, 15, 0.8) 100%
        );
        opacity: 0.7;
        transition: opacity 0.4s ease;
      }
    }

    .game-info {
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.2);

      h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        transition: color 0.3s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .arrow {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
        flex-shrink: 0;
      }
    }

    /* Platform selection */
    .card-back {
      display: flex;
      flex-direction: column;
      aspect-ratio: 3 / 4;
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.04);
      border: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      font-weight: 600;
      padding: 14px 16px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 8px;

      .back-arrow {
        transition: transform 0.2s ease;
      }

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.06);

        .back-arrow {
          transform: translateX(-3px);
        }
      }
    }

    .platform-list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: rgba(0, 0, 0, 0.3);
    }

    .platform-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: none;
      background: var(--btn-color);
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      padding: 16px 8px;

      .platform-icon {
        font-size: 36px;
        line-height: 1;
      }

      .platform-name {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
      }

      &:hover {
        background: var(--btn-hover);
      }

      &:active {
        transform: scale(0.97);
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 900px) {
      .games-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
    }

    @media (max-width: 768px) {
      .matchfinder-container {
        padding: 32px 16px;
      }

      .hero {
        margin-bottom: 32px;

        h1 {
          font-size: 34px;
        }
      }

      .games-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
    }

    @media (max-width: 520px) {
      .hero h1 {
        font-size: 28px;
      }

      .hero-badge {
        font-size: 10px;
        padding: 6px 12px;
      }

      .games-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .game-info {
        padding: 10px 12px;

        h3 {
          font-size: 12px;
        }
      }

      .back-btn {
        font-size: 11px;
        padding: 10px 12px;
      }

      .platform-btn {
        gap: 6px;
        padding: 12px 8px;

        .platform-icon {
          font-size: 28px;
        }

        .platform-name {
          font-size: 10px;
          letter-spacing: 1px;
        }
      }
    }
  `]
})
export class MatchfinderComponent {
  selectedGame: string | null = null;
  hoveredGame: string | null = null;

  games: Game[] = [
    {
      name: 'Modern Warfare 2',
      slug: 'mw2',
      image: 'assets/games/mw2.webp',
      platforms: [
        { name: 'IW4X', slug: 'iw4x', color: '#991b1b', hoverColor: '#b91c1c', icon: 'fa-solid fa-desktop' },
        { name: 'Xbox', slug: 'xbox', color: '#14532d', hoverColor: '#166534', icon: 'fa-brands fa-xbox' },
        { name: 'PS3', slug: 'ps3', color: '#1e3a5f', hoverColor: '#1e4d8a', icon: 'fa-brands fa-playstation' }
      ]
    },
    {
      name: 'Black Ops 2',
      slug: 'bo2',
      image: 'assets/games/bo2.webp',
      platforms: [
        { name: 'Plutonium', slug: 'plutonium', color: '#991b1b', hoverColor: '#b91c1c', icon: 'fa-solid fa-desktop' },
        { name: 'Xbox', slug: 'xbox', color: '#14532d', hoverColor: '#166534', icon: 'fa-brands fa-xbox' },
        { name: 'PS3', slug: 'ps3', color: '#1e3a5f', hoverColor: '#1e4d8a', icon: 'fa-brands fa-playstation' }
      ]
    },
    {
      name: 'MW 2019',
      slug: 'mw 2019',
      image: 'assets/games/mw 2019.webp',
      platforms: [
        { name: 'Cross-Platform', slug: 'cross-platform', color: '#3b1578', hoverColor: '#4c1d95', icon: 'fa-solid fa-globe' }
      ]
    }
  ];

  selectGame(slug: string | null): void {
    this.selectedGame = slug;
  }

  constructor(private router: Router) {}

  selectPlatform(game: Game, platform: GamePlatform): void {
    this.router.navigate(['/matchfinder', game.slug, platform.slug]);
  }
}
