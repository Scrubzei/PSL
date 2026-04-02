import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface PlayerDetailsDialogData {
  player: {
    id: string;
    username: string;
    xboxGamertag?: string | null;
    plutoniumUsername?: string | null;
    discordUsername?: string | null;
  };
  platformName: string;
}

@Component({
  selector: 'app-player-details-dialog',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="player-dialog">
      <div class="dialog-header">
        <div class="player-avatar-lg">
          <span>{{ data.player.username.charAt(0).toUpperCase() }}</span>
        </div>
        <h2>{{ data.player.username }}</h2>
        <button class="close-btn" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="details-list">
        <div class="detail-row">
          <mat-icon class="detail-icon site-icon">person</mat-icon>
          <div class="detail-content">
            <span class="detail-label">Site Username</span>
            <span class="detail-value">{{ data.player.username }}</span>
          </div>
        </div>

        <div class="detail-row" [class.missing]="!data.player.discordUsername">
          <div class="platform-badge discord">
            <mat-icon>chat</mat-icon>
            <span>DISCORD</span>
          </div>
          <div class="detail-content">
            <span class="detail-label">Discord Username</span>
            @if (data.player.discordUsername) {
              <span class="detail-value gamertag discord-tag">{{ data.player.discordUsername }}</span>
            } @else {
              <span class="detail-value not-set">Not synced yet</span>
            }
          </div>
        </div>

        @if (isXbox) {
          <div class="detail-row xbox-row" [class.missing]="!data.player.xboxGamertag">
            <div class="platform-badge xbox">
              <mat-icon>sports_esports</mat-icon>
              <span>XBOX</span>
            </div>
            <div class="detail-content">
              <span class="detail-label">Xbox Gamertag</span>
              @if (data.player.xboxGamertag) {
                <span class="detail-value gamertag">{{ data.player.xboxGamertag }}</span>
              } @else {
                <span class="detail-value not-set">Not set</span>
              }
            </div>
          </div>
        }

        @if (isPluto) {
          <div class="detail-row pluto-row" [class.missing]="!data.player.plutoniumUsername">
            <div class="platform-badge pluto">
              <mat-icon>computer</mat-icon>
              <span>PLUTO</span>
            </div>
            <div class="detail-content">
              <span class="detail-label">Plutonium Username</span>
              @if (data.player.plutoniumUsername) {
                <span class="detail-value gamertag">{{ data.player.plutoniumUsername }}</span>
              } @else {
                <span class="detail-value not-set">Not set</span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .player-dialog {
      background: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      min-width: 320px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 20px 20px 16px;
      border-bottom: 1px solid #2a2a2a;

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: white;
        flex: 1;
      }
    }

    .player-avatar-lg {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #22d3ee, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      color: #0a0a0a;
      flex-shrink: 0;
    }

    .close-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.4);
      cursor: pointer;
      padding: 4px;
      display: flex;
      border-radius: 4px;
      &:hover { color: white; background: rgba(255, 255, 255, 0.1); }
    }

    .details-list {
      padding: 8px 0;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 20px;
      border-bottom: 1px solid #222;

      &:last-child { border-bottom: none; }
      &.missing { opacity: 0.5; }
    }

    .detail-icon {
      color: rgba(255, 255, 255, 0.4);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .site-icon {
      margin-left: 8px;
      margin-right: 8px;
    }

    .platform-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      flex-shrink: 0;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.xbox {
        background: rgba(16, 124, 16, 0.15);
        border: 1px solid rgba(16, 124, 16, 0.4);
        color: #4caf50;
      }

      &.pluto {
        background: rgba(33, 150, 243, 0.15);
        border: 1px solid rgba(33, 150, 243, 0.4);
        color: #42a5f5;
      }

      &.discord {
        background: rgba(88, 101, 242, 0.15);
        border: 1px solid rgba(88, 101, 242, 0.4);
        color: #7289da;
      }
    }

    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .detail-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-size: 15px;
      font-weight: 600;
      color: white;

      &.gamertag {
        color: #22d3ee;
      }

      &.discord-tag {
        color: #7289da;
      }

      &.not-set {
        color: rgba(255, 255, 255, 0.25);
        font-style: italic;
        font-weight: 400;
      }
    }
  `]
})
export class PlayerDetailsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<PlayerDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PlayerDetailsDialogData,
  ) {}

  get isXbox(): boolean {
    return this.data.platformName === 'Xbox';
  }

  get isPluto(): boolean {
    return this.data.platformName === 'Plutonium';
  }
}
