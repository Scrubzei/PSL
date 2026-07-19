import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { SafePipe } from '../shared/safe.pipe';
import * as THREE from 'three';

interface LandingPageVideo {
  name: string;
  link: string;
  startTs: number | null;
  endTs: number | null;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, SafePipe],
  template: `
    <div class="landing">


      <!-- Live match ticker is now the global <app-live-activity> component (rendered under the navbar). -->

      <!-- Hero -->
      <section class="hero">
        <canvas #heroCanvas class="hero-canvas"></canvas>
        <div class="hero-bg">
          <div class="orb orb-1"></div>
          <div class="orb orb-2"></div>
          <div class="scanlines"></div>
        </div>
        <div class="hero-split">
          <div class="hero-left">
            <div class="hero-live-pill">
              <span class="live-dot"></span>
              {{ liveCount }} match{{ liveCount === 1 ? '' : 'es' }} live now
            </div>
            <h1>Premier<br><span class="gradient-text">Sniping League</span></h1>
            <p class="tagline">Ranked queues, live drafts, seasonal ladders, and real rewards — all in one place.</p>
            <div class="hero-actions">
              <button class="btn-primary" (click)="signIn()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                Sign in with Discord
              </button>
              <a routerLink="/leaderboards" class="btn-ghost">View Leaderboards</a>
            </div>
            <div class="hero-games">
              <span class="game-pill">COD4</span>
              <span class="game-pill">MW2</span>
              <span class="game-pill">BO1</span>
              <span class="game-pill">MW3</span>
              <span class="game-pill">BO2</span>
            </div>
          </div>
          <div class="hero-right">
            <div class="video-frame">
              <iframe
                [src]="activeVideoEmbedUrl | safe"
                frameborder="0"
                allow="autoplay; encrypted-media"
                allowfullscreen>
              </iframe>
              <div class="video-overlay"></div>
              <div class="video-glow"></div>
            </div>
            <p class="video-caption">{{ activeVideo.name }}</p>
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="features">
        <div class="features-inner">
          <div class="section-label">What we're building</div>
          <h2 class="section-title">Everything a sniping community needs</h2>

          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-icon"><i class="fa-solid fa-crosshairs"></i></div>
              <h3>Ranked 1v1 Queues</h3>
              <p>Queue up, get matched, play. Automated matchmaking with ELO-based ranking across every title.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="fa-solid fa-users"></i></div>
              <h3>4v4 Captain Drafts</h3>
              <p>Eight players, two captains, snake draft. The fairest way to split a lobby into two competitive squads.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="fa-solid fa-trophy"></i></div>
              <h3>Tournaments</h3>
              <p>Single-elimination brackets with seeding, map pools, and real prize pots. No dead-tournament promises.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="fa-solid fa-shield-halved"></i></div>
              <h3>Teams & Rosters</h3>
              <p>Found a team, build your roster, run clan matches. One tag, one banner, one identity across the league.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="fa-solid fa-chart-line"></i></div>
              <h3>Seasons & Standings</h3>
              <p>Fixed-window seasons with live standings. Climb the ladder, earn end-of-season rewards and tags.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon"><i class="fa-solid fa-store"></i></div>
              <h3>Points & Rewards</h3>
              <p>Earn points every match. Spend them on custom Discord roles, name colors, profile flair, and more.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <section class="cta">
        <div class="cta-inner">
          <h2>Ready to compete?</h2>
          <p>Join the Discord, sign in, and start climbing.</p>
          <div class="cta-actions">
            <a href="https://discord.gg/psl" target="_blank" rel="noopener" class="btn-discord">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              Join the Discord
            </a>
            <button class="btn-primary" (click)="signIn()">Get Started</button>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <span>&copy; 2026 Premier Sniping League</span>
      </footer>

    </div>
  `,
  styles: [`
    .landing {
      background: #0a0a0f;
      color: white;
    }

    /* ── Landing Nav ── */
    .landing-nav {
      background: #0a0a0f;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .landing-nav-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 32px;
      height: 56px;
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .landing-brand {
      display: flex;
      align-items: center;
      text-decoration: none;
      margin-right: 8px;

      img {
        height: 36px;
        width: auto;
        object-fit: contain;
      }
    }

    .landing-links {
      display: flex;
      align-items: center;
      gap: 4px;

      a {
        padding: 6px 16px;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.5);
        text-decoration: none;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-radius: 6px;
        transition: color 0.15s, background 0.15s;

        &:hover {
          color: white;
          background: rgba(255, 255, 255, 0.04);
        }
      }
    }

    .landing-signin {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: linear-gradient(135deg, #7C3AED, #6D28D9);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
      box-shadow: 0 2px 12px rgba(124, 58, 237, 0.25);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
      }
    }

    /* Live match ticker styling now lives in the global <app-live-activity> component. */

    /* ── Hero ── */
    .hero {
      position: relative;
      padding-top: 56px;
      padding-bottom: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
    }

    .hero-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);

      &.orb-1 { width: 600px; height: 600px; background: rgba(124, 58, 237, 0.12); top: -200px; left: -100px; }
      &.orb-2 { width: 500px; height: 500px; background: rgba(220, 38, 38, 0.08); bottom: -100px; right: -100px; }
    }

    .scanlines {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.005) 2px, rgba(255,255,255,0.005) 4px);
    }

    .hero-split {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 56px;
      max-width: 1200px;
      width: 100%;
      padding: 0 48px;
    }

    .hero-left {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .hero-right {
      flex: 0 0 520px;
      position: relative;
      margin-bottom: -120px;
      z-index: 4;
    }

    .video-frame {
      position: relative;
      aspect-ratio: 16 / 9;
      background: #111;
      border-radius: 4px;
      overflow: hidden;
      border: 2px solid rgba(124, 58, 237, 0.5);
      box-shadow:
        0 0 0 6px rgba(10, 10, 15, 0.9),
        0 0 0 7px rgba(220, 38, 38, 0.25),
        0 0 40px rgba(124, 58, 237, 0.2),
        0 0 80px rgba(124, 58, 237, 0.1),
        0 30px 80px rgba(0, 0, 0, 0.7);

      iframe {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: none;
        pointer-events: none;
      }

      &::before, &::after {
        content: '';
        position: absolute;
        width: 28px;
        height: 28px;
        z-index: 3;
        pointer-events: none;
      }

      &::before {
        top: 10px;
        left: 10px;
        border-top: 2px solid rgba(124, 58, 237, 0.7);
        border-left: 2px solid rgba(124, 58, 237, 0.7);
      }

      &::after {
        bottom: 10px;
        right: 10px;
        border-bottom: 2px solid rgba(220, 38, 38, 0.6);
        border-right: 2px solid rgba(220, 38, 38, 0.6);
      }
    }

    .video-overlay {
      position: absolute;
      inset: 0;
      z-index: 2;
      cursor: default;
    }

    .video-caption {
      text-align: center;
      margin: 18px 0 0;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      letter-spacing: 0.3px;
    }

    .video-glow {
      position: absolute;
      inset: -12px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(220, 38, 38, 0.2));
      z-index: -1;
      filter: blur(35px);
      animation: glowPulse 4s ease-in-out infinite;
    }

    @keyframes glowPulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 0.8; }
    }

    .hero-logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      margin-bottom: 16px;
      filter: drop-shadow(0 0 24px rgba(124, 58, 237, 0.5));
    }

    .hero-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #A855F7;
      margin-bottom: 12px;
    }

    .hero-live-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: 100px;
      font-size: 14px;
      font-weight: 600;
      color: rgba(239, 68, 68, 0.8);
      margin-bottom: 16px;
      width: fit-content;

      .live-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #ef4444;
        animation: dotPulse 2s ease-in-out infinite;
      }
    }

    @keyframes dotPulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
    }

    .hero h1 {
      font-family: 'Chakra Petch', sans-serif;
      font-size: clamp(42px, 6vw, 64px);
      font-weight: 700;
      margin: 0 0 12px;
      letter-spacing: 1px;
      line-height: 1;
      text-transform: uppercase;
    }

    .gradient-text {
      background: linear-gradient(135deg, #A855F7 0%, #DC2626 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .tagline {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.45);
      line-height: 1.65;
      margin: 0 0 20px;
      max-width: 400px;
    }

    .hero-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 36px;
    }

    .hero-games {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      .game-pill {
        padding: 5px 14px;
        border-radius: 6px;
        background: rgba(124, 58, 237, 0.08);
        border: 1px solid rgba(124, 58, 237, 0.2);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 1.5px;
        color: rgba(168, 85, 247, 0.7);
        text-transform: uppercase;
      }
    }

    /* ── Buttons ── */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #7C3AED, #6D28D9);
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
      box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(124, 58, 237, 0.4);
      }
    }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      padding: 14px 28px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      font-family: inherit;
      transition: all 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.25);
        color: white;
      }
    }

    .btn-discord {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 28px;
      background: #5865F2;
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      font-family: inherit;
      transition: all 0.2s;
      box-shadow: 0 4px 16px rgba(88, 101, 242, 0.3);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(88, 101, 242, 0.4);
      }
    }

    /* ── Dividers ── */
    .divider {
      position: relative;
      margin-top: -1px;
      margin-bottom: -1px;
      line-height: 0;
      z-index: 3;

      svg {
        display: block;
        width: 100%;
        height: 80px;
      }

      &.flip svg {
        transform: scaleX(-1);
      }
    }

    /* ── Game Marquee ── */
    .marquee {
      background: #0a0a0f;
      overflow: hidden;
      padding: 32px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      position: relative;

      &::before, &::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        width: 120px;
        z-index: 1;
        pointer-events: none;
      }

      &::before {
        left: 0;
        background: linear-gradient(to right, #0a0a0f, transparent);
      }

      &::after {
        right: 0;
        background: linear-gradient(to left, #0a0a0f, transparent);
      }
    }

    .marquee-track {
      display: flex;
      gap: 60px;
      animation: marqueeScroll 20s linear infinite;
      width: max-content;

      span {
        font-family: 'Chakra Petch', sans-serif;
        font-size: 32px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.06);
        white-space: nowrap;
        letter-spacing: 4px;
        text-transform: uppercase;
      }
    }

    @keyframes marqueeScroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* ── Stats Strip ── */
    .stats-strip {
      background: #0a0a0f;
      padding: 48px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .stats-inner {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
    }

    .stat-item {
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-number {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: white;
      letter-spacing: 0.5px;
    }

    .stat-label {
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.3);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat-divider {
      width: 1px;
      height: 36px;
      background: rgba(255, 255, 255, 0.06);
      flex-shrink: 0;
    }

    /* ── Features ── */
    .features {
      position: relative;
      background: #141420;
      padding: 80px 24px 120px;

      &::before {
        content: '';
        position: absolute;
        top: -80px;
        left: 0;
        right: 0;
        height: 80px;
        background: #141420;
        clip-path: polygon(0 100%, 100% 0, 100% 100%);
      }
    }

    .features-inner {
      max-width: 1100px;
      margin: 0 auto;
    }

    .section-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #A855F7;
      margin-bottom: 12px;
    }

    .section-title {
      font-family: 'Chakra Petch', sans-serif;
      font-size: clamp(32px, 4vw, 44px);
      font-weight: 700;
      margin: 0 0 56px;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .feature-card {
      padding: 32px 28px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      transition: all 0.3s ease;

      &:hover {
        border-color: rgba(124, 58, 237, 0.2);
        background: rgba(124, 58, 237, 0.03);
        transform: translateY(-4px);
      }

      h3 {
        font-size: 17px;
        font-weight: 600;
        margin: 0 0 10px;
        color: white;
      }

      p {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.4);
        line-height: 1.7;
        margin: 0;
      }
    }

    .feature-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(124, 58, 237, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;

      i {
        font-size: 20px;
        color: #A855F7;
      }
    }

    /* ── Games Strip ── */
    .games-strip {
      padding: 60px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .games-inner {
      max-width: 900px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .game-item {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 16 / 9;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: brightness(0.6);
        transition: all 0.4s ease;
      }

      span {
        position: absolute;
        bottom: 12px;
        left: 14px;
        font-size: 13px;
        font-weight: 700;
        color: white;
        text-shadow: 0 1px 4px rgba(0,0,0,0.5);
      }

      &:hover img {
        filter: brightness(0.8);
        transform: scale(1.05);
      }
    }

    /* ── CTA ── */
    .cta {
      padding: 120px 24px;
      text-align: center;
    }

    .cta-inner {
      max-width: 500px;
      margin: 0 auto;

      h2 {
        font-family: 'Chakra Petch', sans-serif;
        font-size: 36px;
        font-weight: 700;
        margin: 0 0 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      p {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.4);
        margin: 0 0 32px;
      }
    }

    .cta-actions {
      display: flex;
      gap: 14px;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* ── Footer ── */
    .footer {
      padding: 32px 24px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 13px;
      color: rgba(255, 255, 255, 0.2);
    }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .hero-split {
        flex-direction: column;
        text-align: center;
        padding: 24px;
        gap: 32px;
      }

      .hero-left {
        align-items: center;
      }

      .hero-right {
        flex: none;
        width: 100%;
        max-width: 480px;
        margin-bottom: -100px;
      }

      .hero-actions { justify-content: center; }
      .hero-games { justify-content: center; }
      .tagline { margin-left: auto; margin-right: auto; }
    }

    @media (max-width: 768px) {
      .feature-grid {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .games-inner {
        grid-template-columns: repeat(2, 1fr);
      }

      .features { padding: 60px 24px 80px; }
      .cta { padding: 80px 24px; }
      .hero-logo { width: 100px; height: 100px; }
      .stats-inner { flex-wrap: wrap; gap: 24px; }
      .stat-divider { display: none; }
      .stat-item { flex: 0 0 40%; }
      .stat-number { font-size: 24px; }
    }

    @media (max-width: 480px) {
      .landing-links { display: none; }
      .landing-nav-inner { padding: 0 16px; }
      .hero h1 { font-size: 28px; }
      .tagline { font-size: 14px; }
      .hero-logo { width: 80px; height: 80px; }
      .hero-right { max-width: 300px; margin-bottom: -60px; }
    }
  `]
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  games = [
    { name: 'Modern Warfare 2', image: 'assets/games/mw2.webp' },
    { name: 'Black Ops 1', image: 'assets/games/bo1.webp' },
    { name: 'Modern Warfare 3', image: 'assets/games/mw3.webp' },
    { name: 'Black Ops 2', image: 'assets/games/bo2.webp' },
  ];

  videos: LandingPageVideo[] = [
    { name: 'Figure vs Skyz by Brutal', link: 'https://www.youtube.com/watch?v=M5hCq5sAsgw', startTs: null, endTs: null },
  ];

  marqueeGames = ['COD4', 'MODERN WARFARE 2', 'BLACK OPS', 'MODERN WARFARE 3', 'BLACK OPS 2'];

  /** Count of currently-live matches, from the real feed (set on load). */
  liveCount = 0;

  get activeVideo(): LandingPageVideo { return this.videos[0]; }

  get activeVideoEmbedUrl(): string {
    const v = this.activeVideo;
    const id = v.link.match(/[?&]v=([^&]+)/)?.[1] || '';
    let url = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&playsinline=1`;
    if (v.startTs != null) url += `&start=${v.startTs}`;
    if (v.endTs != null) url += `&end=${v.endTs}`;
    return url;
  }

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private particles!: THREE.Points;
  private animId = 0;
  private mouse = { x: 0, y: 0 };
  private onMouseMove = (e: MouseEvent) => {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };
  private onResize = () => this.resize();

  constructor(private authService: AuthService, private usersService: UsersService) {
    // HttpClient observables complete after one emission, so this self-unsubscribes.
    this.usersService.getGlobalRecentWins(50).subscribe({
      next: (matches) => (this.liveCount = matches.filter(m => m.status === 'LIVE').length),
      error: () => {},
    });
  }

  signIn(): void {
    this.authService.initiateDiscordLogin();
  }

  ngAfterViewInit(): void {
    this.initThree();
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
    this.renderer?.dispose();
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    this.camera.position.z = 30;

    // Particles
    const count = 600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);

    const purple = new THREE.Color(0x7C3AED);
    const red = new THREE.Color(0xDC2626);
    const amber = new THREE.Color(0xF59E0B);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 60;
      positions[i3 + 1] = (Math.random() - 0.5) * 60;
      positions[i3 + 2] = (Math.random() - 0.5) * 40;

      const r = Math.random();
      const color = r < 0.45 ? purple : r < 0.8 ? red : amber;
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 2.5 + 0.5;
      speeds[i] = Math.random() * 0.3 + 0.1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec3 pos = position;
          pos.y += mod(uTime * 0.3 + position.x * 0.1, 60.0) - 30.0;
          pos.x += sin(uTime * 0.2 + position.y * 0.05) * 0.5;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * uPixelRatio * (20.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;

          float dist = length(mvPos.xyz);
          vAlpha = smoothstep(40.0, 10.0, dist) * 0.7;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);

    this.animate();
  }

  private animate = (): void => {
    this.animId = requestAnimationFrame(this.animate);
    const time = performance.now() * 0.001;

    (this.particles.material as THREE.ShaderMaterial).uniforms['uTime'].value = time;

    // Subtle camera follow on mouse
    this.camera.position.x += (this.mouse.x * 3 - this.camera.position.x) * 0.02;
    this.camera.position.y += (this.mouse.y * 2 - this.camera.position.y) * 0.02;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
