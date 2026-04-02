import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersService, UserProfile } from '../users/users.service';

export interface SwapPlayerDialogData {
  currentPlayer: { id: string; username: string };
  tournamentId: string;
  participantIds: Set<string>;
}

@Component({
  selector: 'app-swap-player-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="swap-dialog">
      <div class="dialog-header">
        <mat-icon class="swap-icon">swap_horiz</mat-icon>
        <h2>Swap Player</h2>
        <button class="close-btn" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="current-player">
        <span class="label">Replacing</span>
        <span class="player-name">{{ data.currentPlayer.username }}</span>
      </div>

      <div class="search-section">
        <input
          class="search-input"
          [(ngModel)]="searchQuery"
          placeholder="Search users..."
          (input)="onSearch()"
          autofocus />
      </div>

      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="28"></mat-spinner>
        </div>
      } @else {
        <div class="user-list">
          @for (user of filteredUsers; track user.id) {
            <button
              class="user-item"
              [class.selected]="selectedUser?.id === user.id"
              [class.is-current]="user.id === data.currentPlayer.id"
              (click)="selectUser(user)"
              [disabled]="isInTournament(user.id)">
              <mat-icon class="user-avatar">account_circle</mat-icon>
              <span class="user-name">{{ user.username }}</span>
              @if (user.id === data.currentPlayer.id) {
                <span class="current-badge">Current</span>
              } @else if (isInTournament(user.id)) {
                <span class="current-badge">In tournament</span>
              } @else if (selectedUser?.id === user.id) {
                <mat-icon class="check">check_circle</mat-icon>
              }
            </button>
          }
          @if (filteredUsers.length === 0 && !loading) {
            <div class="empty">No users found</div>
          }
        </div>
      }

      <div class="dialog-actions">
        <button class="cancel-btn" (click)="dialogRef.close()">Cancel</button>
        <button
          class="confirm-btn"
          [disabled]="!selectedUser"
          (click)="confirm()">
          <mat-icon>swap_horiz</mat-icon>
          Swap
        </button>
      </div>
    </div>
  `,
  styles: [`
    .swap-dialog {
      background: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 70vh;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      border-bottom: 1px solid #2a2a2a;

      h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: white;
        flex: 1;
      }
    }

    .swap-icon {
      color: #22d3ee;
      font-size: 22px;
      width: 22px;
      height: 22px;
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

    .current-player {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      background: rgba(244, 67, 54, 0.08);
      border-bottom: 1px solid #2a2a2a;

      .label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .player-name {
        font-weight: 600;
        color: #f44336;
        font-size: 14px;
      }
    }

    .search-section {
      padding: 12px 16px;
      border-bottom: 1px solid #2a2a2a;
    }

    .search-input {
      width: 100%;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid #333;
      border-radius: 6px;
      color: white;
      font-size: 13px;
      font-family: inherit;
      box-sizing: border-box;

      &::placeholder { color: rgba(255, 255, 255, 0.3); }
      &:focus { outline: none; border-color: #22d3ee; }
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 32px;
    }

    .user-list {
      overflow-y: auto;
      max-height: 40vh;
      scrollbar-width: thin;
      scrollbar-color: #333 transparent;
    }

    .user-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px 20px;
      background: none;
      border: none;
      border-bottom: 1px solid #222;
      color: rgba(255, 255, 255, 0.85);
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s;
      text-align: left;

      &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); }
      &:disabled { opacity: 0.4; cursor: default; }
      &.selected { background: rgba(34, 211, 238, 0.08); }
      &:last-child { border-bottom: none; }
    }

    .user-avatar {
      color: rgba(255, 255, 255, 0.3);
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .user-name { flex: 1; font-weight: 500; }

    .current-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.4);
    }

    .check {
      color: #22d3ee;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .empty {
      padding: 32px;
      text-align: center;
      color: rgba(255, 255, 255, 0.4);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #2a2a2a;
    }

    .cancel-btn {
      padding: 8px 16px;
      background: none;
      border: 1px solid #333;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      &:hover { background: rgba(255, 255, 255, 0.06); color: white; }
    }

    .confirm-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: rgba(34, 211, 238, 0.15);
      border: 1px solid rgba(34, 211, 238, 0.3);
      border-radius: 6px;
      color: #22d3ee;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover:not(:disabled) { background: rgba(34, 211, 238, 0.25); }
      &:disabled { opacity: 0.3; cursor: default; }
    }
  `]
})
export class SwapPlayerDialogComponent implements OnInit {
  users: UserProfile[] = [];
  filteredUsers: UserProfile[] = [];
  selectedUser: UserProfile | null = null;
  searchQuery = '';
  loading = true;

  constructor(
    public dialogRef: MatDialogRef<SwapPlayerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SwapPlayerDialogData,
    private usersService: UsersService,
  ) {}

  ngOnInit(): void {
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = users;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(u =>
        u.username.toLowerCase().includes(q)
      );
    }
  }

  isInTournament(userId: string): boolean {
    return this.data.participantIds.has(userId);
  }

  selectUser(user: UserProfile): void {
    if (this.isInTournament(user.id)) return;
    this.selectedUser = this.selectedUser?.id === user.id ? null : user;
  }

  confirm(): void {
    if (this.selectedUser) {
      this.dialogRef.close(this.selectedUser);
    }
  }
}
