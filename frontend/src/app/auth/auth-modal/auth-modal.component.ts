import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth.service';

export interface AuthModalData {
  message?: string;
}

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="auth-modal">
      <button mat-icon-button class="close-btn" (click)="close()">
        <mat-icon>close</mat-icon>
      </button>

      <div class="modal-content">
        <div class="icon-wrapper">
          <mat-icon>sports_esports</mat-icon>
        </div>

        <h2>Sign in to continue</h2>

        @if (data.message) {
          <p class="context-message">{{ data.message }}</p>
        }

        <button type="button" class="discord-btn" (click)="loginWithDiscord()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Continue with Discord
        </button>

        <p class="note">You'll be redirected to Discord to sign in</p>
      </div>
    </div>
  `,
  styles: [`
    .auth-modal {
      position: relative;
      padding: 32px;
      text-align: center;
      background: #1e1e1e;
      min-width: 320px;
    }

    .close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      color: rgba(255, 255, 255, 0.5);

      &:hover {
        color: white;
      }
    }

    .modal-content {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .icon-wrapper {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, var(--theme-primary-bright, #64b5f6) 0%, #5865F2 100%);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(88, 101, 242, 0.3);

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: white;
      }
    }

    h2 {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 600;
      color: white;
    }

    .context-message {
      margin: 0 0 24px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
    }

    .discord-btn {
      width: 100%;
      padding: 14px 24px;
      background: #5865F2;
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(88, 101, 242, 0.3);
      font-family: inherit;

      &:hover {
        background: #4752c4;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(88, 101, 242, 0.4);
      }

      &:active {
        transform: translateY(0);
      }

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .note {
      margin: 16px 0 0;
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }

    @media (max-width: 480px) {
      .auth-modal {
        padding: 24px 20px;
        min-width: unset;
      }
    }
  `]
})
export class AuthModalComponent {
  constructor(
    private dialogRef: MatDialogRef<AuthModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AuthModalData,
    private authService: AuthService
  ) {}

  close(): void {
    this.dialogRef.close(false);
  }

  loginWithDiscord(): void {
    this.dialogRef.close(true);
    this.authService.initiateDiscordLogin();
  }
}
