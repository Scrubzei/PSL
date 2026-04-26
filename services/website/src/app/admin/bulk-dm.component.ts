import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { environment } from '../../environments/environment';

interface User {
  id: string;
  username: string;
  discordId: string;
  discordUsername: string;
  selected: boolean;
}

@Component({
  selector: 'app-bulk-dm',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatButtonModule, MatCheckboxModule],
  template: `
    <div class="page">
      <div class="container">
        <h1>Send DMs</h1>

        <div class="message-box">
          <label>Message</label>
          <textarea
            [(ngModel)]="message"
            placeholder="Type your message here..."
            rows="4"
          ></textarea>
        </div>

        <div class="toolbar">
          <div class="select-controls">
            <button mat-stroked-button (click)="selectAll()">Select All</button>
            <button mat-stroked-button (click)="selectNone()">Select None</button>
            <span class="count">{{ selectedCount }} / {{ users.length }} selected</span>
          </div>
          <div class="search-box">
            <input
              type="text"
              [(ngModel)]="search"
              placeholder="Search users..."
            />
          </div>
        </div>

        <div class="user-list">
          @if (loading) {
            <p class="loading">Loading users...</p>
          }
          @for (user of filteredUsers; track user.id) {
            <label class="user-row" [class.selected]="user.selected">
              <mat-checkbox
                [(ngModel)]="user.selected"
                color="primary"
              ></mat-checkbox>
              <span class="username">{{ user.username }}</span>
              <span class="discord">{{ user.discordUsername || user.discordId }}</span>
            </label>
          }
          @if (!loading && filteredUsers.length === 0) {
            <p class="empty">No users found.</p>
          }
        </div>

        <button
          mat-flat-button
          color="primary"
          class="send-btn"
          [disabled]="sending || selectedCount === 0 || !message.trim()"
          (click)="send()"
        >
          @if (sending) {
            Sending...
          } @else {
            Send to {{ selectedCount }} user{{ selectedCount === 1 ? '' : 's' }}
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page {
      background: #0a0a0f;
      min-height: 100%;
    }

    .container {
      max-width: 700px;
      margin: 0 auto;
      padding: 48px 24px;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      color: white;
      margin: 0 0 32px;
    }

    .message-box {
      margin-bottom: 24px;

      label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      textarea {
        width: 100%;
        padding: 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: white;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;

        &::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }

        &:focus {
          outline: none;
          border-color: rgba(37, 99, 235, 0.5);
        }
      }
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .select-controls {
      display: flex;
      align-items: center;
      gap: 8px;

      button {
        font-size: 12px;
      }

      .count {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.4);
        margin-left: 8px;
      }
    }

    .search-box input {
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-family: inherit;
      width: 200px;

      &::placeholder {
        color: rgba(255, 255, 255, 0.2);
      }

      &:focus {
        outline: none;
        border-color: rgba(37, 99, 235, 0.5);
      }
    }

    .user-list {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .user-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      cursor: pointer;
      transition: background 0.1s;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.03);
      }

      &.selected {
        background: rgba(37, 99, 235, 0.06);
      }
    }

    .username {
      font-size: 14px;
      font-weight: 600;
      color: white;
      flex: 1;
    }

    .discord {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.3);
    }

    .loading, .empty {
      padding: 40px;
      text-align: center;
      color: rgba(255, 255, 255, 0.3);
      font-size: 14px;
    }

    .send-btn {
      width: 100%;
      padding: 14px;
      font-size: 15px;
      font-weight: 600;
    }
  `],
})
export class BulkDmComponent implements OnInit {
  users: User[] = [];
  message = '';
  search = '';
  loading = true;
  sending = false;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/users`).subscribe({
      next: (users) => {
        this.users = users
          .filter((u: any) => u.discordId)
          .map((u: any) => ({
            id: u.id,
            username: u.username || 'Unknown',
            discordId: u.discordId,
            discordUsername: u.discordUsername || '',
            selected: false,
          }))
          .sort((a: User, b: User) => a.username.localeCompare(b.username));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load users', 'Close', { duration: 3000 });
      },
    });
  }

  get filteredUsers(): User[] {
    if (!this.search.trim()) return this.users;
    const q = this.search.toLowerCase();
    return this.users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.discordUsername.toLowerCase().includes(q) ||
        u.discordId.includes(q),
    );
  }

  get selectedCount(): number {
    return this.users.filter((u) => u.selected).length;
  }

  selectAll(): void {
    this.filteredUsers.forEach((u) => (u.selected = true));
  }

  selectNone(): void {
    this.users.forEach((u) => (u.selected = false));
  }

  send(): void {
    const discordIds = this.users.filter((u) => u.selected).map((u) => u.discordId);
    if (discordIds.length === 0 || !this.message.trim()) return;

    this.sending = true;
    this.http
      .post<{ sent: number; failed: number; errors: string[] }>(
        `${environment.apiUrl}/botzei/bulk-dm`,
        { discordIds, message: this.message.trim() },
      )
      .subscribe({
        next: (result) => {
          this.sending = false;
          let msg = `Sent to ${result.sent} user${result.sent === 1 ? '' : 's'}`;
          if (result.failed > 0) {
            msg += ` (${result.failed} failed — DMs may be disabled)`;
          }
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        },
        error: (err) => {
          this.sending = false;
          this.snackBar.open(
            err.error?.message || 'Failed to send DMs',
            'Close',
            { duration: 4000 },
          );
        },
      });
  }
}
