import { Component, Inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface TournamentJoinModalData {
  tournamentName: string;
  gameName: string;
  platformName: string;
  plutoniumUsername: string | null;
  xboxGamertag: string | null;
  startDate: string | Date | null;
  roundDeadlines: { name: string; deadline: string | null }[] | null;
  prizePool: { place: number; prize: string }[] | null;
  howItWorks: string | null;
  disqualifications: string[] | null;
}

interface RoundSchedule {
  name: string;
  deadline: string;
}

@Component({
  selector: 'app-tournament-join-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="join-modal" #modalContent>
      <div class="modal-header">
        <mat-icon class="trophy">emoji_events</mat-icon>
        <h2>Join the {{ data.tournamentName }}</h2>
      </div>

      <!-- Prize Pool -->
      @if (data.prizePool?.length) {
        <div class="prize-section">
          <h3>
            <mat-icon>attach_money</mat-icon>
            Prize Pool
          </h3>
          <div class="prize-list">
            @for (entry of data.prizePool; track entry.place) {
              <div class="prize-item" [class.first]="entry.place === 1" [class.second]="entry.place === 2" [class.third]="entry.place === 3">
                <mat-icon class="prize-trophy" [class.gold]="entry.place === 1" [class.silver]="entry.place === 2" [class.bronze]="entry.place === 3">emoji_events</mat-icon>
                <span class="prize-place">{{ getPlaceLabel(entry.place) }}</span>
                <span class="prize-amount">{{ entry.prize }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Rules (hidden for MW2) -->
      @if (!isMw2) {
        <div class="rules-section">
          <h3>
            <mat-icon>gavel</mat-icon>
            Rules
          </h3>
          <p>All participants must follow <a href="/rules" target="_blank" rel="noopener" class="rules-link">1v1 Leaderboards Rules</a>.</p>
        </div>
      }

      <!-- Schedule -->
      <div class="schedule-section">
        <h3>
          <mat-icon>schedule</mat-icon>
          Schedule & Deadlines
        </h3>
        <p>Each round must be completed by its deadline.</p>
        <div class="round-list">
          <div class="round-item start-date-item">
            <span class="round-label">Tournament Starts</span>
            <span class="round-detail start-detail">{{ startDateFormatted }}</span>
          </div>
          @for (round of rounds; track round.name) {
            <div class="round-item">
              <span class="round-label">{{ round.name }}</span>
              <span class="round-detail">{{ round.deadline }}</span>
            </div>
          }
        </div>
      </div>

      <!-- How It Works -->
      @if (data.howItWorks) {
        <div class="schedule-section">
          <h3>
            <mat-icon>info</mat-icon>
            How It Works
          </h3>
          <p class="schedule-note">{{ data.howItWorks }}</p>
        </div>
      }

      <!-- Important / Disqualifications -->
      @if (data.disqualifications?.length) {
        <div class="important-section">
          <h3>
            <mat-icon>warning</mat-icon>
            Important
          </h3>
          <div class="dq-list">
            @for (dq of data.disqualifications; track dq) {
              <p class="schedule-note dq-item"><span class="schedule-warning">{{ dq }}</span></p>
            }
          </div>
        </div>
      }

      <!-- Discord Requirement -->
      <div class="discord-section">
        <h3>
          <svg class="discord-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Discord Required
        </h3>
        <p>You must be in our Discord server to participate in tournaments.</p>
        <a href="https://discord.gg/1v1lb" target="_blank" rel="noopener" class="discord-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Join discord.gg/1v1lb
          <mat-icon class="external">open_in_new</mat-icon>
        </a>
      </div>

      <!-- Platform Username -->
      <div class="pluto-section">
        @if (isXbox) {
          <h3>
            <mat-icon>person</mat-icon>
            Xbox Gamertag
          </h3>
          <p>Enter your Xbox Gamertag. This is required to participate.</p>
          <input
            type="text"
            [(ngModel)]="xboxGamertag"
            placeholder="Your Xbox Gamertag"
            class="pluto-input"
          />
        } @else {
          <h3>
            <mat-icon>person</mat-icon>
            Plutonium Username
          </h3>
          <p>Enter the username you use on Plutonium. This is required to participate.</p>
          <input
            type="text"
            [(ngModel)]="plutoniumUsername"
            placeholder="Your Plutonium username"
            class="pluto-input"
          />
        }
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="cancel-btn" (click)="cancel()">Cancel</button>
        <button class="confirm-btn" (click)="confirm()" [disabled]="!usernameValid">
          <mat-icon>bolt</mat-icon>
          Confirm & Join
        </button>
      </div>
    </div>
  `,
  styles: [`
    .join-modal {
      padding: 20px;
      background: #1a1a1a;
      max-width: 540px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;

      .trophy {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #f0c850;
      }

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: white;
      }
    }

    .important-section {
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(239, 68, 68, 0.04);
      border-radius: 10px;
      border: 1px solid rgba(239, 68, 68, 0.25);

      h3 {
        color: #ef4444;

        mat-icon {
          color: #ef4444;
        }
      }
    }

    .prize-section, .rules-section, .schedule-section, .discord-section, .pluto-section {
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 10px;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);

      mat-icon, .discord-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    ul {
      margin: 0;
      padding: 0 0 0 20px;
      list-style: none;

      li {
        position: relative;
        padding: 4px 0;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.5;

        &::before {
          content: '';
          position: absolute;
          left: -14px;
          top: 11px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }

    p {
      margin: 0 0 12px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
      line-height: 1.5;
    }

    .discord-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: #5865F2;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: filter 0.15s;

      .external {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-left: auto;
        opacity: 0.7;
        color: white;
      }

      &:hover {
        filter: brightness(1.1);
      }
    }

    .prize-list {
      display: flex;
      gap: 10px;
    }

    .prize-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);

      &.first { border-color: rgba(255, 215, 0, 0.2); background: rgba(255, 215, 0, 0.05); }
      &.second { border-color: rgba(192, 192, 192, 0.15); }
      &.third { border-color: rgba(205, 127, 50, 0.15); }
    }

    .prize-place {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .prize-trophy {
      font-size: 28px;
      width: 28px;
      height: 28px;
      margin-bottom: 4px;

      &.gold { color: #FFD700; filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.5)); }
      &.silver { color: #C0C0C0; }
      &.bronze { color: #CD7F32; }
    }

    .prize-amount {
      font-size: 14px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
    }

    .rules-link {
      color: var(--theme-primary-bright, #ff4444);
      text-decoration: none;
      font-weight: 600;

      &:hover {
        text-decoration: underline;
      }
    }

    .round-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .round-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      border-left: 3px solid var(--theme-primary, #bf2120);

      &.start-date-item {
        border-left-color: #f0c850;
        margin-bottom: 4px;
      }
    }

    .start-detail {
      color: rgba(255, 255, 255, 0.9) !important;
      font-weight: 600 !important;
    }

    .round-label {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }

    .round-detail {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.6);
    }

    .schedule-note {
      margin: 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.6;
    }

    .schedule-warning {
      color: rgba(255, 255, 255, 0.9);
      font-weight: 600;
    }

    .dq-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }

    .dq-item {
      margin: 0;
    }

    .pluto-input {
      width: 100%;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s;

      &::placeholder {
        color: rgba(255, 255, 255, 0.25);
      }

      &:focus {
        border-color: rgba(var(--theme-primary-rgb), 0.5);
      }
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 24px;
    }

    .cancel-btn {
      padding: 10px 20px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        color: white;
      }
    }

    .confirm-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 24px;
      background: var(--theme-primary);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: filter 0.15s;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover:not(:disabled) {
        filter: brightness(1.15);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  `]
})
export class TournamentJoinModalComponent implements AfterViewInit {
  @ViewChild('modalContent') modalContent!: ElementRef;
  plutoniumUsername: string;
  xboxGamertag: string;
  rounds: RoundSchedule[] = [];
  startDateFormatted = '';
  isMw2 = false;
  isXbox = false;

  constructor(
    private dialogRef: MatDialogRef<TournamentJoinModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TournamentJoinModalData,
  ) {
    this.plutoniumUsername = data.plutoniumUsername || '';
    this.xboxGamertag = data.xboxGamertag || '';
    this.isMw2 = data.gameName?.toLowerCase() === 'mw2';
    this.isXbox = data.platformName?.toLowerCase() === 'xbox';
    this.buildSchedule();
  }

  get usernameValid(): boolean {
    return this.isXbox ? !!this.xboxGamertag.trim() : !!this.plutoniumUsername.trim();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.modalContent?.nativeElement) {
        this.modalContent.nativeElement.scrollTop = 0;
      }
    });
  }

  private buildSchedule(): void {
    const startDate = this.data.startDate ? new Date(this.data.startDate) : new Date();
    this.startDateFormatted = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    if (this.data.roundDeadlines?.length) {
      this.rounds = this.data.roundDeadlines.map(r => ({
        name: r.name,
        deadline: r.deadline
          ? `Due by ${new Date(r.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : 'TBD between finalists',
      }));
    }
  }

  getPlaceLabel(place: number): string {
    if (place === 1) return '1st';
    if (place === 2) return '2nd';
    if (place === 3) return '3rd';
    return `${place}th`;
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    if (!this.usernameValid) return;
    if (this.isXbox) {
      this.dialogRef.close({ confirmed: true, xboxGamertag: this.xboxGamertag.trim() });
    } else {
      this.dialogRef.close({ confirmed: true, plutoniumUsername: this.plutoniumUsername.trim() });
    }
  }
}
