import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatDialogRef } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { UsersService, UserProfile } from "../users/users.service";
import { AuthService } from "./auth.service";

@Component({
  selector: "app-dev-login-modal",
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, FormsModule],
  template: `
    <div class="dev-login-modal">
      <div class="modal-header">
        <mat-icon class="dev-icon">code</mat-icon>
        <h2>Dev Login</h2>
        <button class="close-btn" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="create-section">
        <input
          class="create-input"
          [(ngModel)]="newUsername"
          placeholder="Create new user..."
          (keyup.enter)="createAndLogin()"
          [disabled]="!!loggingInAs"
        />
        <button
          class="create-btn"
          (click)="createAndLogin()"
          [disabled]="!newUsername.trim() || !!loggingInAs"
        >
          @if (loggingInAs === newUsername.trim() && !isExistingUser) {
            <mat-spinner diameter="16"></mat-spinner>
          } @else {
            <mat-icon>add</mat-icon>
          }
        </button>
      </div>

      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="32"></mat-spinner>
        </div>
      } @else {
        <div class="user-list">
          @for (user of users; track user.id) {
            <button
              class="user-item"
              [class.logging-in]="loggingInAs === user.username"
              (click)="loginAs(user)"
              [disabled]="!!loggingInAs"
            >
              <mat-icon class="user-avatar">account_circle</mat-icon>
              <span class="user-name">{{ user.username }}</span>
              @if (loggingInAs === user.username) {
                <mat-spinner diameter="18" class="login-spinner"></mat-spinner>
              } @else {
                <mat-icon class="arrow">chevron_right</mat-icon>
              }
            </button>
          }
          @if (users.length === 0) {
            <div class="empty">No users found</div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dev-login-modal {
        background: #1a1a1a;
        border-radius: 12px;
        overflow: hidden;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
      }

      .modal-header {
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

      .dev-icon {
        color: #ff9800;
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

        &:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }
      }

      .create-section {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid #2a2a2a;
      }

      .create-input {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid #333;
        border-radius: 6px;
        color: white;
        font-size: 13px;
        font-family: inherit;

        &::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        &:focus {
          outline: none;
          border-color: #ff9800;
        }
      }

      .create-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: rgba(255, 152, 0, 0.15);
        border: 1px solid rgba(255, 152, 0, 0.3);
        border-radius: 6px;
        color: #ff9800;
        cursor: pointer;
        flex-shrink: 0;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        &:hover:not(:disabled) {
          background: rgba(255, 152, 0, 0.25);
        }

        &:disabled {
          opacity: 0.3;
          cursor: default;
        }
      }

      .loading {
        display: flex;
        justify-content: center;
        padding: 40px;
      }

      .user-list {
        overflow-y: auto;
        max-height: 50vh;
        scrollbar-width: thin;
        scrollbar-color: #333 transparent;
      }

      .user-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 20px;
        background: none;
        border: none;
        border-bottom: 1px solid #222;
        color: rgba(255, 255, 255, 0.85);
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s;
        text-align: left;

        &:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
        }

        &:disabled {
          opacity: 0.5;
          cursor: default;
        }

        &.logging-in {
          opacity: 1;
          background: rgba(255, 152, 0, 0.08);
        }

        &:last-child {
          border-bottom: none;
        }
      }

      .user-avatar {
        color: rgba(255, 255, 255, 0.3);
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .user-name {
        flex: 1;
        font-weight: 500;
      }

      .arrow {
        color: rgba(255, 255, 255, 0.2);
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .login-spinner {
        margin-left: auto;
      }

      .empty {
        padding: 40px;
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
      }
    `,
  ],
})
export class DevLoginModalComponent implements OnInit {
  users: UserProfile[] = [];
  loading = true;
  loggingInAs: string | null = null;
  newUsername = "";
  isExistingUser = false;

  constructor(
    public dialogRef: MatDialogRef<DevLoginModalComponent>,
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.usersService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loginAs(user: UserProfile): void {
    if (this.loggingInAs) return;
    this.isExistingUser = true;
    this.loggingInAs = user.username;

    this.authService.devLogin(user.username).subscribe({
      next: () => {
        this.dialogRef.close(user);
      },
      error: () => {
        this.loggingInAs = null;
      },
    });
  }

  createAndLogin(): void {
    const username = this.newUsername.trim();
    if (!username || this.loggingInAs) return;
    this.isExistingUser = false;
    this.loggingInAs = username;

    this.authService.devLogin(username).subscribe({
      next: () => {
        this.dialogRef.close({ username });
      },
      error: () => {
        this.loggingInAs = null;
      },
    });
  }
}
