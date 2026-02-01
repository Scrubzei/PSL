import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TournamentsService, Tournament } from './tournaments.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-tournaments-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="tournaments-container">
      <div class="header">
        <h1>Tournaments</h1>
        @if (isAdmin) {
          <button mat-raised-button color="primary" routerLink="/tournaments/create">
            <mat-icon>add</mat-icon> Create Tournament
          </button>
        }
      </div>

      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading tournaments...</p>
        </div>
      } @else if (tournaments.length === 0) {
        <div class="empty-state">
          <mat-icon>emoji_events</mat-icon>
          <p>No tournaments yet</p>
          @if (isAdmin) {
            <button mat-raised-button color="primary" routerLink="/tournaments/create">
              Create the first tournament
            </button>
          }
        </div>
      } @else {
        <div class="tournaments-grid">
          @for (tournament of tournaments; track tournament.id) {
            <mat-card class="tournament-card" [routerLink]="['/tournaments', tournament.id]">
              <mat-card-header>
                <mat-card-title>{{ tournament.name }}</mat-card-title>
                <mat-card-subtitle>
                  {{ tournament.game.name }} - {{ tournament.platform.name }}
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="tournament-info">
                  <div class="info-row">
                    <span class="label">Format:</span>
                    <span>{{ formatName(tournament.format) }}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Players:</span>
                    <span>{{ tournament.participantCount }} / {{ tournament.maxParticipants }}</span>
                  </div>
                  @if (tournament.startDate) {
                    <div class="info-row">
                      <span class="label">Starts:</span>
                      <span>{{ tournament.startDate | date:'short' }}</span>
                    </div>
                  }
                </div>
              </mat-card-content>
              <mat-card-footer>
                <mat-chip [class]="'status-' + tournament.status.toLowerCase()">
                  {{ statusLabel(tournament.status) }}
                </mat-chip>
              </mat-card-footer>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .tournaments-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h1 {
        margin: 0;
        color: white;
      }
    }

    .loading-container, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: rgba(255, 255, 255, 0.5);

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
      }

      p {
        margin: 0 0 16px;
      }
    }

    .tournaments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .tournament-card {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }

      mat-card-header {
        margin-bottom: 16px;
      }

      mat-card-title {
        font-size: 18px;
        color: white;
      }

      mat-card-subtitle {
        color: var(--theme-primary-bright, #64b5f6);
      }
    }

    .tournament-info {
      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;

        .label {
          color: rgba(255, 255, 255, 0.6);
        }
      }
    }

    mat-card-footer {
      padding: 16px;
      border-top: 1px solid #2d2d2d;
    }

    .status-registration {
      background: #4caf50 !important;
      color: white !important;
    }

    .status-in_progress {
      background: #ff9800 !important;
      color: white !important;
    }

    .status-completed {
      background: #607d8b !important;
      color: white !important;
    }

    .status-cancelled {
      background: #f44336 !important;
      color: white !important;
    }
  `]
})
export class TournamentsListComponent implements OnInit {
  tournaments: Tournament[] = [];
  loading = true;

  constructor(
    private tournamentsService: TournamentsService,
    private authService: AuthService,
  ) {}

  get isAdmin(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.loading = true;
    this.tournamentsService.getAll().subscribe({
      next: (tournaments) => {
        this.tournaments = tournaments;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  formatName(format: string): string {
    return format.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'REGISTRATION': return 'Open for Registration';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }
}
