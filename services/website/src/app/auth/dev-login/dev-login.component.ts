import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dev-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dev-login-page">
      @if (!isDevMode) {
        <div class="not-available">
          <mat-icon>block</mat-icon>
          <h2>Not Available</h2>
          <p>Dev login is only available in development mode.</p>
        </div>
      } @else {
        <mat-card class="login-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="dev-icon">code</mat-icon>
              Dev Login
            </mat-card-title>
            <mat-card-subtitle>Development only - login by username</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="warning-banner">
              <mat-icon>warning</mat-icon>
              <span>This bypasses authentication. For development use only.</span>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username</mat-label>
              <input
                matInput
                [(ngModel)]="username"
                placeholder="Enter username to login as"
                (keyup.enter)="login()"
                autofocus />
              <mat-icon matPrefix>person</mat-icon>
            </mat-form-field>
          </mat-card-content>

          <mat-card-actions>
            <button
              mat-raised-button
              color="primary"
              (click)="login()"
              [disabled]="!username.trim() || loading">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>login</mat-icon>
                Login as User
              }
            </button>
          </mat-card-actions>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .dev-login-page {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: #121212;
    }

    .not-available {
      text-align: center;
      color: rgba(255, 255, 255, 0.6);

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        color: #f44336;
      }

      h2 {
        margin: 0 0 8px;
        color: white;
      }

      p {
        margin: 0;
      }
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      background: #1e1e1e;
      border: 1px solid #2d2d2d;
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: white !important;

      .dev-icon {
        color: #ff9800;
      }
    }

    mat-card-subtitle {
      color: rgba(255, 255, 255, 0.6) !important;
    }

    .warning-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      margin-bottom: 24px;
      color: #ffb74d;
      font-size: 13px;

      mat-icon {
        color: #ff9800;
        flex-shrink: 0;
      }
    }

    .full-width {
      width: 100%;
    }

    mat-card-actions {
      padding: 16px !important;

      button {
        width: 100%;

        mat-icon, mat-spinner {
          margin-right: 8px;
        }
      }
    }
  `]
})
export class DevLoginComponent implements OnInit {
  username = '';
  loading = false;
  isDevMode = !environment.production;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Redirect if in production or already logged in
    if (environment.production) {
      this.router.navigate(['/']);
      return;
    }

    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  login(): void {
    if (!this.username.trim() || this.loading) return;

    this.loading = true;
    this.authService.devLogin(this.username.trim()).subscribe({
      next: () => {
        this.snackBar.open(`Logged in as ${this.username}`, 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(
          err.error?.message || 'Login failed. User may not exist.',
          'Close',
          { duration: 5000 }
        );
      }
    });
  }
}
