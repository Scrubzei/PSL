import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../auth.service';
import { PendingActionService } from '../pending-action.service';

@Component({
  selector: 'app-discord-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="callback-page">
      <div class="callback-content">
        <mat-spinner diameter="48"></mat-spinner>
        <p>{{ message }}</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-page {
      min-height: 100vh;
      background: #121212;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .callback-content {
      text-align: center;

      mat-spinner {
        margin: 0 auto 24px;
      }

      p {
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        margin: 0;
      }
    }
  `]
})
export class DiscordCallbackComponent implements OnInit {
  message = 'Completing login...';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private pendingActionService: PendingActionService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const needsUsername = this.route.snapshot.queryParamMap.get('needsUsername') === 'true';
    const discordUsername = this.route.snapshot.queryParamMap.get('discordUsername');

    if (token) {
      this.authService.handleDiscordCallback(token, needsUsername, discordUsername).subscribe({
        next: () => {
          // Check for pending actions first
          if (this.authService.hasPendingAction() && !needsUsername) {
            this.message = 'Completing your action...';
            this.pendingActionService.executePendingAction();
          } else {
            // Normal navigation
            this.authService.navigateAfterDiscordLogin(needsUsername);
          }
        },
        error: (err) => {
          if (err.status === 401) {
            this.message = 'Login failed. Redirecting...';
            setTimeout(() => {
              this.router.navigate(['/leaderboards']);
            }, 2000);
          }
        }
      });
    } else {
      this.message = 'Login failed. Redirecting...';
      setTimeout(() => {
        this.router.navigate(['/leaderboards']);
      }, 2000);
    }
  }
}
