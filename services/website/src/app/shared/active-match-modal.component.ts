import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActiveTournamentMatch } from '../tournaments/tournaments.service';

interface ActiveMatchModalData extends ActiveTournamentMatch {
  currentUserId?: string;
}

@Component({
  selector: 'app-active-match-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="modal-container">
      <div class="glow-effect"></div>

      <button class="close-btn" (click)="close()">
        <mat-icon>close</mat-icon>
      </button>

      <div class="header">
        <div class="pulse-ring"></div>
        <div class="icon-container">
          <mat-icon>sports_esports</mat-icon>
        </div>
        <h2>Match Ready!</h2>
        <p class="subtitle">You have an active tournament match</p>
      </div>

      <div class="match-card">
        <div class="tournament-info">
          <span class="tournament-name">{{ data.tournament.name }}</span>
          <div class="meta">
            <span class="game">{{ data.tournament.game?.name }}</span>
            <span class="divider"></span>
            <span class="platform">{{ data.tournament.platform?.name }}</span>
          </div>
        </div>

        <div class="matchup">
          <div class="player">
            <div class="avatar" [class.you]="isCurrentUser(data.match.player1?.id)">
              <span>{{ getInitial(data.match.player1?.username) }}</span>
            </div>
            <span class="name">{{ data.match.player1?.username || 'TBD' }}</span>
            @if (isCurrentUser(data.match.player1?.id)) {
              <span class="you-badge">You</span>
            }
          </div>

          <div class="vs-container">
            <span class="vs">VS</span>
          </div>

          <div class="player">
            <div class="avatar" [class.you]="isCurrentUser(data.match.player2?.id)">
              <span>{{ getInitial(data.match.player2?.username) }}</span>
            </div>
            <span class="name">{{ data.match.player2?.username || 'TBD' }}</span>
            @if (isCurrentUser(data.match.player2?.id)) {
              <span class="you-badge">You</span>
            }
          </div>
        </div>

        @if (data.match.gameMap) {
          <div class="map-info">
            <mat-icon>map</mat-icon>
            <span class="label">Map:</span>
            <span class="value">{{ data.match.gameMap.mapName }}</span>
          </div>
        }

        <div class="round-info">
          <mat-icon>account_tree</mat-icon>
          <span>{{ getRoundName(data.match.round) }}</span>
        </div>
      </div>

      <div class="actions">
        <button class="view-btn" (click)="viewTournament()">
          <mat-icon>visibility</mat-icon>
          View Tournament
        </button>
        <button class="later-btn" (click)="close()">
          Remind Me Later
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      position: relative;
      padding: 32px;
      background: linear-gradient(145deg, #1a1a2e, #0f0f1a);
      border-radius: 20px;
      max-width: 420px;
      overflow: hidden;
    }

    .glow-effect {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.1) 0%, transparent 50%);
      animation: rotate 10s linear infinite;
      pointer-events: none;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.2s ease;
      z-index: 10;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .header {
      text-align: center;
      margin-bottom: 28px;
      position: relative;
    }

    .pulse-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80px;
      height: 80px;
      border: 2px solid rgba(34, 211, 238, 0.3);
      border-radius: 50%;
      animation: pulse 2s ease-out infinite;
    }

    @keyframes pulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.5);
        opacity: 0;
      }
    }

    .icon-container {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      background: linear-gradient(135deg, #22D3EE, #06B6D4);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(34, 211, 238, 0.3);
      position: relative;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #0f172a;
      }
    }

    h2 {
      margin: 0 0 4px;
      font-size: 24px;
      font-weight: 700;
      color: white;
    }

    .subtitle {
      margin: 0;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }

    .match-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .tournament-info {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .tournament-name {
      display: block;
      font-size: 16px;
      font-weight: 600;
      color: white;
      margin-bottom: 6px;
    }

    .meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
    }

    .divider {
      width: 4px;
      height: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
    }

    .matchup {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 20px;
    }

    .player {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 90px;
    }

    .avatar {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: linear-gradient(135deg, #334155, #1e293b);
      border: 2px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: #94A3B8;

      &.you {
        border-color: #22D3EE;
        box-shadow: 0 0 20px rgba(34, 211, 238, 0.3);
      }
    }

    .name {
      font-size: 14px;
      font-weight: 500;
      color: white;
      text-align: center;
    }

    .you-badge {
      font-size: 10px;
      padding: 2px 8px;
      background: rgba(34, 211, 238, 0.2);
      color: #22D3EE;
      border-radius: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .vs-container {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .vs {
      font-size: 14px;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 2px;
    }

    .map-info, .round-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      margin-bottom: 10px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #22D3EE;
      }

      .label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
      }

      .value {
        font-size: 14px;
        font-weight: 600;
        color: white;
      }
    }

    .round-info {
      margin-bottom: 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);

      mat-icon {
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .view-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, #22D3EE, #06B6D4);
      border: none;
      border-radius: 12px;
      color: #0f172a;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(34, 211, 238, 0.4);
      }
    }

    .later-btn {
      width: 100%;
      padding: 12px 24px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: white;
      }
    }
  `]
})
export class ActiveMatchModalComponent {
  constructor(
    private dialogRef: MatDialogRef<ActiveMatchModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ActiveMatchModalData,
    private router: Router,
  ) {}

  isCurrentUser(id: string | undefined): boolean {
    return id === this.data.currentUserId;
  }

  getInitial(username: string | undefined): string {
    return username?.charAt(0).toUpperCase() || '?';
  }

  getRoundName(round: number): string {
    if (round === 1) return 'Grand Finals';
    if (round === 2) return 'Semi-Finals';
    if (round === 3) return 'Quarter-Finals';
    return `Round ${round}`;
  }

  viewTournament(): void {
    this.dialogRef.close();
    this.router.navigate(['/tournaments', this.data.tournament.slug]);
  }

  close(): void {
    this.dialogRef.close();
  }
}
