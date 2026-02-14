import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-download',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-wrapper">
      <div class="download-container">
        <img src="assets/logo.webp" alt="1v1 Leaderboards" class="logo">
        <h1>1v1 Leaderboards Launcher</h1>
        <p class="subtitle">Queue for ranked matches, run anticheat, and manage your Plutonium settings — all in one place.</p>

        <a href="https://github.com/1v1Leaderboards/launcher/releases/latest" class="btn-download" target="_blank">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download for Windows
        </a>

        <div class="features">
          <div class="feature">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="22" y1="12" x2="18" y2="12"/>
                <line x1="6" y1="12" x2="2" y2="12"/>
                <line x1="12" y1="6" x2="12" y2="2"/>
                <line x1="12" y1="22" x2="12" y2="18"/>
              </svg>
            </div>
            <h3>Matchmaking</h3>
            <p>Queue for ranked 1v1 matches directly from the launcher.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <h3>Anticheat</h3>
            <p>Built-in anticheat to keep matches fair and competitive.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <h3>Auto-Config</h3>
            <p>Automatic movement commands and game settings management.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      background: #0a0a0f;
      min-height: 100%;
    }

    .download-container {
      max-width: 640px;
      margin: 0 auto;
      padding: 80px 24px;
      text-align: center;
    }

    .logo {
      width: 72px;
      height: 72px;
      margin-bottom: 24px;
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      color: white;
      margin: 0 0 12px;
    }

    .subtitle {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.5);
      line-height: 1.6;
      margin: 0 0 32px;
    }

    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 32px;
      background: var(--theme-primary, #bf2120);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;

      svg {
        width: 20px;
        height: 20px;
      }

      &:hover {
        filter: brightness(1.15);
        box-shadow: 0 0 24px rgba(var(--theme-primary-rgb, 191, 33, 32), 0.4);
      }
    }

    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 64px;
      text-align: center;
    }

    .feature {
      padding: 24px 16px;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
    }

    .feature-icon {
      width: 40px;
      height: 40px;
      margin: 0 auto 16px;
      border-radius: 10px;
      background: rgba(var(--theme-primary-rgb, 191, 33, 32), 0.1);
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 20px;
        height: 20px;
        color: var(--theme-primary-bright, #ff4444);
      }
    }

    h3 {
      font-size: 14px;
      font-weight: 600;
      color: white;
      margin: 0 0 8px;
    }

    .feature p {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
      line-height: 1.5;
      margin: 0;
    }

    @media (max-width: 600px) {
      .download-container {
        padding: 48px 16px;
      }

      h1 {
        font-size: 24px;
      }

      .features {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DownloadComponent {}
