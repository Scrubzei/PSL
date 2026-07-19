import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-welcome-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="welcome-modal">
      <div class="glow-orb"></div>

      <div class="modal-content">
        <div class="icon-wrapper">
          <img src="/assets/psl-logo.png" alt="PSL" style="width: 48px; height: 48px; object-fit: contain;" />
        </div>

        <h2>Welcome to PSL</h2>

        <p class="message">
          Premier Sniping League is still a work in progress. Most of what you see here
          is placeholder data, so don't take the stats too seriously just yet.
        </p>

        <p class="message">
          Feel free to poke around and check things out. We're building something
          cool for the sniping community.
        </p>

        <a href="https://discord.gg/pslgaming" target="_blank" rel="noopener" class="discord-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Join the Discord
        </a>

        <button type="button" class="got-it-btn" (click)="close()">
          Got it, let me explore
        </button>
      </div>
    </div>
  `,
  styles: [`
    .welcome-modal {
      position: relative;
      padding: 36px 32px 28px;
      text-align: center;
      background: #1a1a1a;
      min-width: 340px;
      max-width: 400px;
      overflow: hidden;
    }

    .glow-orb {
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, var(--theme-primary-bright, #64b5f6) 0%, transparent 70%);
      opacity: 0.15;
      pointer-events: none;
    }

    .modal-content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .icon-wrapper {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, var(--theme-primary-bright, #64b5f6) 0%, var(--theme-primary, #1976d2) 100%);
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      box-shadow: 0 8px 32px rgba(var(--theme-primary-rgb, 25, 118, 210), 0.3);

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: white;
      }
    }

    h2 {
      margin: 0 0 16px;
      font-size: 24px;
      font-weight: 600;
      color: white;
    }

    .message {
      margin: 0 0 12px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      line-height: 1.6;
    }

    .discord-btn {
      width: 100%;
      margin-top: 20px;
      padding: 14px 24px;
      background: #5865F2;
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(88, 101, 242, 0.3);
      text-decoration: none;
      font-family: inherit;

      &:hover {
        background: #4752c4;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(88, 101, 242, 0.4);
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .got-it-btn {
      width: 100%;
      margin-top: 12px;
      padding: 14px 24px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.3);
        color: white;
      }
    }

    @media (max-width: 480px) {
      .welcome-modal {
        padding: 28px 20px 24px;
        min-width: unset;
      }
    }
  `]
})
export class WelcomeModalComponent {
  constructor(private dialogRef: MatDialogRef<WelcomeModalComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
