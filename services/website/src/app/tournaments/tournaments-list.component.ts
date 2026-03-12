import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TournamentsService, Tournament } from './tournaments.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-tournaments-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="tournaments-page">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-bg"></div>
        <div class="hero-overlay"></div>
        <div class="hero-grid"></div>

        <!-- Floating particles -->
        <div class="particles">
          @for (i of particles; track i) {
            <div class="particle" [style.--i]="i"></div>
          }
        </div>

        <div class="hero-content">
          <div class="hero-badge">
            <mat-icon>emoji_events</mat-icon>
            <span>COMPETE & CONQUER</span>
          </div>
          <h1 class="hero-title">TOURNAMENTS</h1>
          <p class="hero-subtitle">Battle your way to glory in competitive brackets</p>

          @if (isAdmin) {
            <button class="create-btn" routerLink="/tournaments/create">
              <mat-icon>add</mat-icon>
              <span>Create Tournament</span>
            </button>
          }
        </div>
      </div>

      <!-- Main Content -->
      <div class="content-section">
        @if (loading) {
          <div class="loading-container">
            <div class="loading-spinner">
              <mat-spinner diameter="48"></mat-spinner>
            </div>
            <p>Loading tournaments...</p>
          </div>
        } @else if (tournaments.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <mat-icon>emoji_events</mat-icon>
            </div>
            <h2>No Tournaments Yet</h2>
            <p>Be the first to compete when tournaments launch</p>
            @if (isAdmin) {
              <button class="create-btn" routerLink="/tournaments/create">
                <mat-icon>add</mat-icon>
                <span>Create First Tournament</span>
              </button>
            }
          </div>
        } @else {
          <!-- Featured Tournament (first active one) -->
          @if (featuredTournament; as ft) {
            <div class="featured-section">
              <div class="section-header">
                <div class="section-badge">
                  <mat-icon>local_fire_department</mat-icon>
                  <span>FEATURED</span>
                </div>
              </div>

              <div class="featured-card" [routerLink]="['/tournaments', ft.slug]">
                <div class="featured-bg" [style.background-image]="'url(' + getGameImage(ft) + ')'"></div>
                <div class="featured-overlay"></div>
                <div class="featured-glow"></div>

                <div class="featured-content">
                  <div class="featured-status" [class]="'status-' + ft.status.toLowerCase()">
                    <span class="status-dot"></span>
                    {{ statusLabel(ft.status) }}
                  </div>

                  <h2 class="featured-title">{{ ft.name }}</h2>

                  <div class="featured-meta">
                    <div class="meta-item">
                      <mat-icon>sports_esports</mat-icon>
                      <span>{{ ft.game.name.toUpperCase() }}</span>
                    </div>
                    <div class="meta-item">
                      <mat-icon>devices</mat-icon>
                      <span>{{ ft.platform.name }}</span>
                    </div>
                    <div class="meta-item">
                      <mat-icon>group</mat-icon>
                      <span>{{ ft.participantCount }}/{{ ft.maxParticipants }}</span>
                    </div>
                  </div>

                  @if (ft.status === 'REGISTRATION') {
                    <div class="featured-progress">
                      <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="(ft.participantCount! / ft.maxParticipants) * 100"></div>
                      </div>
                      <span class="progress-text">{{ ft.maxParticipants - ft.participantCount! }} spots left</span>
                    </div>
                  }

                  <button class="featured-btn">
                    <span>View Tournament</span>
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- All Tournaments Grid -->
          <div class="tournaments-section">
            <div class="section-header">
              <h2>All Tournaments</h2>
              <div class="tournament-count">{{ tournaments.length }} total</div>
            </div>

            <div class="tournaments-grid">
              @for (tournament of tournaments; track tournament.id) {
                <div class="tournament-card" [routerLink]="['/tournaments', tournament.slug]" [class.is-active]="tournament.status === 'REGISTRATION' || tournament.status === 'BRACKET_READY' || tournament.status === 'IN_PROGRESS'">
                  <!-- Card background -->
                  <div class="card-bg" [style.background-image]="'url(' + getGameImage(tournament) + ')'"></div>
                  <div class="card-overlay"></div>

                  <!-- Status indicator -->
                  <div class="card-status" [class]="'status-' + tournament.status.toLowerCase()">
                    @if (tournament.status === 'REGISTRATION') {
                      <span class="pulse"></span>
                    }
                    {{ shortStatusLabel(tournament.status) }}
                  </div>

                  <!-- Card content -->
                  <div class="card-content">
                    <div class="card-game">
                      {{ tournament.game.name.toUpperCase() }} · {{ tournament.platform.name }}
                    </div>
                    <h3 class="card-title">{{ tournament.name }}</h3>

                    <div class="card-stats">
                      <div class="stat">
                        <mat-icon>group</mat-icon>
                        <span>{{ tournament.participantCount }}/{{ tournament.maxParticipants }}</span>
                      </div>
                      <div class="stat">
                        <mat-icon>account_tree</mat-icon>
                        <span>{{ formatName(tournament.format) }}</span>
                      </div>
                    </div>

                    @if (tournament.status === 'REGISTRATION') {
                      <div class="card-progress">
                        <div class="mini-progress-bar">
                          <div class="mini-progress-fill" [style.width.%]="((tournament.participantCount ?? 0) / tournament.maxParticipants) * 100"></div>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Admin feature button -->
                  @if (isAdmin) {
                    <button class="feature-btn" [class.is-featured]="tournament.isFeatured" (click)="featureTournament($event, tournament.id)" title="Set as featured">
                      <mat-icon>{{ tournament.isFeatured ? 'star' : 'star_border' }}</mat-icon>
                    </button>
                  }

                  <!-- Hover arrow -->
                  <div class="card-arrow">
                    <mat-icon>arrow_forward</mat-icon>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tournaments-page {
      min-height: 100%;
    }

    /* ==================== HERO SECTION ==================== */
    .hero-section {
      position: relative;
      padding: 80px 24px 100px;
      overflow: visible;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 30% 20%, rgba(var(--theme-primary-rgb), 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(var(--theme-primary-rgb), 0.1) 0%, transparent 40%);
    }

    .hero-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
    }

    .particles {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: var(--theme-primary-bright);
      border-radius: 50%;
      opacity: 0;
      animation: float 8s ease-in-out infinite;
      animation-delay: calc(var(--i) * 0.5s);
    }

    .particle:nth-child(1) { left: 10%; top: 20%; }
    .particle:nth-child(2) { left: 20%; top: 60%; }
    .particle:nth-child(3) { left: 35%; top: 30%; }
    .particle:nth-child(4) { left: 50%; top: 70%; }
    .particle:nth-child(5) { left: 65%; top: 25%; }
    .particle:nth-child(6) { left: 80%; top: 55%; }
    .particle:nth-child(7) { left: 90%; top: 35%; }
    .particle:nth-child(8) { left: 75%; top: 80%; }

    @keyframes float {
      0%, 100% {
        opacity: 0;
        transform: translateY(0) scale(0.5);
      }
      20% {
        opacity: 0.8;
        transform: translateY(-20px) scale(1);
      }
      80% {
        opacity: 0.8;
        transform: translateY(-40px) scale(1);
      }
    }

    .hero-content {
      position: relative;
      text-align: center;
      max-width: 600px;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(var(--theme-primary-rgb), 0.15);
      border: 1px solid rgba(var(--theme-primary-rgb), 0.3);
      border-radius: 24px;
      margin-bottom: 20px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--theme-primary-bright);
      }

      span {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 2px;
        color: var(--theme-primary-bright);
      }
    }

    .hero-title {
      font-size: clamp(40px, 10vw, 72px);
      font-weight: 900;
      letter-spacing: 4px;
      margin: 0 0 16px;
      padding-top: 8px;
      color: white;
      line-height: 1.1;
    }

    .hero-subtitle {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 28px;
      letter-spacing: 0.5px;
    }

    .create-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 28px;
      background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-bright) 100%);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(var(--theme-primary-rgb), 0.4);
      font-family: inherit;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 30px rgba(var(--theme-primary-rgb), 0.5);
      }
    }

    /* ==================== CONTENT SECTION ==================== */
    .content-section {
      padding: 40px 24px 60px;
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 20px;

      .loading-spinner {
        margin-bottom: 20px;
      }

      p {
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 20px;
      text-align: center;

      .empty-icon {
        width: 100px;
        height: 100px;
        background: rgba(var(--theme-primary-rgb), 0.1);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: var(--theme-primary-bright);
        }
      }

      h2 {
        margin: 0 0 8px;
        color: white;
        font-size: 24px;
      }

      p {
        margin: 0 0 24px;
        color: rgba(255, 255, 255, 0.5);
      }
    }

    /* ==================== FEATURED SECTION ==================== */
    .featured-section {
      margin-bottom: 48px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: white;
      }

      .tournament-count {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .section-badge {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #ff9800;
      }

      span {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 2px;
        color: #ff9800;
      }
    }

    .featured-card {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      cursor: pointer;
      min-height: 300px;
      display: flex;
      align-items: flex-end;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: #1a1a1a;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border-color: rgba(var(--theme-primary-rgb), 0.3);

        .featured-glow {
          opacity: 1;
        }

        .featured-btn mat-icon {
          transform: translateX(4px);
        }
      }
    }

    .featured-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.5;
      transition: transform 0.5s ease, opacity 0.3s ease;

      .featured-card:hover & {
        transform: scale(1.05);
        opacity: 0.6;
      }
    }

    .featured-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        135deg,
        rgba(0, 0, 0, 0.9) 0%,
        rgba(0, 0, 0, 0.7) 50%,
        rgba(0, 0, 0, 0.85) 100%
      );
    }

    .featured-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 100%, rgba(var(--theme-primary-rgb), 0.2) 0%, transparent 60%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .featured-content {
      position: relative;
      padding: 32px;
      width: 100%;
    }

    .featured-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }

      &.status-registration {
        background: rgba(76, 175, 80, 0.2);
        color: #81c784;

        .status-dot {
          animation: pulse-dot 2s ease-in-out infinite;
        }
      }

      &.status-bracket_ready {
        background: rgba(34, 211, 238, 0.2);
        color: #22D3EE;
      }

      &.status-in_progress {
        background: rgba(255, 152, 0, 0.2);
        color: #ffb74d;
      }

      &.status-completed {
        background: rgba(96, 125, 139, 0.2);
        color: #90a4ae;
      }
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    .featured-title {
      font-size: clamp(28px, 5vw, 42px);
      font-weight: 800;
      color: white;
      margin: 0 0 20px;
      line-height: 1.2;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }

    .featured-meta {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--theme-primary-bright);
      }
    }

    .featured-progress {
      margin-bottom: 24px;
      max-width: 400px;

      .progress-bar {
        height: 8px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--theme-primary) 0%, var(--theme-primary-bright) 100%);
        border-radius: 4px;
        transition: width 0.5s ease;
        box-shadow: 0 0 10px rgba(var(--theme-primary-rgb), 0.5);
        min-width: 4px;
      }

      .progress-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
      }
    }

    .featured-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        transition: transform 0.2s ease;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }
    }

    /* ==================== TOURNAMENTS GRID ==================== */
    .tournaments-section {
      margin-top: 20px;
    }

    .tournaments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .tournament-card {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.05);

      &:hover {
        transform: translateY(-4px);
        border-color: rgba(var(--theme-primary-rgb), 0.3);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);

        .card-bg {
          transform: scale(1.1);
        }

        .card-arrow {
          opacity: 1;
          transform: translateX(0);
        }
      }

      &.is-active {
        border-color: rgba(var(--theme-primary-rgb), 0.2);
      }
    }

    .card-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.4;
      transition: transform 0.5s ease;
    }

    .card-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(30, 30, 30, 0.3) 0%,
        rgba(30, 30, 30, 0.8) 50%,
        rgba(30, 30, 30, 0.98) 100%
      );
    }

    .card-status {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      .pulse {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse-dot 2s ease-in-out infinite;
      }

      &.status-registration {
        background: rgba(76, 175, 80, 0.2);
        color: #81c784;
      }

      &.status-bracket_ready {
        background: rgba(34, 211, 238, 0.2);
        color: #22D3EE;
      }

      &.status-in_progress {
        background: rgba(255, 152, 0, 0.2);
        color: #ffb74d;
      }

      &.status-completed {
        background: rgba(96, 125, 139, 0.2);
        color: #90a4ae;
      }

      &.status-cancelled {
        background: rgba(244, 67, 54, 0.2);
        color: #e57373;
      }
    }

    .card-content {
      position: relative;
      padding: 20px;
    }

    .card-game {
      font-size: 12px;
      font-weight: 600;
      color: var(--theme-primary-bright);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: white;
      margin: 0 0 16px;
      line-height: 1.3;
    }

    .card-stats {
      display: flex;
      gap: 20px;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .card-progress {
      margin-top: 16px;

      .mini-progress-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
      }

      .mini-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--theme-primary) 0%, var(--theme-primary-bright) 100%);
        border-radius: 2px;
        transition: width 0.5s ease;
      }
    }

    .feature-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: rgba(0, 0, 0, 0.5);
      color: rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 3;
      transition: all 0.2s ease;
      padding: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.7);
        color: #f0c850;
      }

      &.is-featured {
        color: #f0c850;
        background: rgba(240, 200, 80, 0.15);
      }
    }

    .card-arrow {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 36px;
      height: 36px;
      background: rgba(var(--theme-primary-rgb), 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.3s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--theme-primary-bright);
      }
    }

    /* ==================== RESPONSIVE ==================== */
    @media (max-width: 768px) {
      .hero-section {
        padding: 60px 20px 60px;
      }

      .hero-title {
        letter-spacing: 2px;
      }

      .content-section {
        padding: 24px 16px 40px;
      }

      .featured-content {
        padding: 24px;
      }

      .featured-meta {
        gap: 16px;
      }

      .tournaments-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .tournament-card {
        min-height: 180px;
      }
    }
  `]
})
export class TournamentsListComponent implements OnInit {
  tournaments: Tournament[] = [];
  loading = true;
  particles = Array.from({ length: 8 }, (_, i) => i);

  private gameImages: Record<string, string> = {
    'Bo1': '/assets/games/bo1.webp',
    'Bo2': '/assets/games/bo2.webp',
    'Mw2': '/assets/games/mw2.webp',
    'Mw3': '/assets/games/mw3.webp',
    'MW 2019': '/assets/games/mw%202019.webp',
  };

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
  ) {}

  get isAdmin(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  get featuredTournament(): Tournament | null {
    const featured = this.tournaments.find(t => t.isFeatured);
    if (featured) return featured;
    // Fallback: first active tournament
    return this.tournaments.find(
      t => t.status === 'REGISTRATION' || t.status === 'BRACKET_READY' || t.status === 'IN_PROGRESS'
    ) || null;
  }

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.loading = true;
    this.tournamentsService.getAll().subscribe({
      next: (tournaments) => {
        this.tournaments = tournaments;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getGameImage(tournament: Tournament): string {
    return this.gameImages[tournament.game.name] || '/assets/games/bo2.webp';
  }

  formatName(format: string): string {
    return format.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'REGISTRATION': return 'Registration Open';
      case 'BRACKET_READY': return 'Bracket Posted';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }

  shortStatusLabel(status: string): string {
    switch (status) {
      case 'REGISTRATION': return 'Open';
      case 'BRACKET_READY': return 'Bracket';
      case 'IN_PROGRESS': return 'Live';
      case 'COMPLETED': return 'Ended';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }

  featureTournament(event: Event, tournamentId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.tournamentsService.featureTournament(tournamentId).subscribe({
      next: () => this.loadTournaments(),
    });
  }
}
