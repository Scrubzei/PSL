import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  status: string;
  maxParticipants: number;
  participantCount: number;
  format: string;
  game: { id: string; name: string };
  platform: { id: string; name: string };
  createdBy: { id: string; username: string };
  registrationDeadline: string | null;
  startDate: string | null;
}

@Component({
  selector: 'app-tournament-spotlight-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="spotlight-modal" [class.loading]="loading">
      @if (loading) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (tournament) {
        <!-- Background layers -->
        <div class="bg-image" [style.background-image]="'url(' + getGameImage() + ')'"></div>
        <div class="bg-gradient"></div>
        <div class="scanlines"></div>
        <div class="noise"></div>

        <!-- Animated particles -->
        <div class="particles">
          @for (i of particles; track i) {
            <div class="particle" [style.--delay]="i * 0.3 + 's'" [style.--x]="getRandomX(i)"></div>
          }
        </div>

        <!-- Content -->
        <div class="modal-content">
          <!-- Badge -->
          <div class="spotlight-badge">
            <mat-icon>local_fire_department</mat-icon>
            <span>FEATURED TOURNAMENT</span>
          </div>

          <!-- Tournament name -->
          <h1 class="tournament-name">{{ tournament.name }}</h1>

          <!-- Game & Platform pills -->
          <div class="meta-pills">
            <div class="pill game-pill">
              <mat-icon>sports_esports</mat-icon>
              {{ tournament.game.name }}
            </div>
            <div class="pill platform-pill">
              <mat-icon>devices</mat-icon>
              {{ tournament.platform.name }}
            </div>
          </div>

          <!-- Description -->
          @if (tournament.description) {
            <p class="description">{{ tournament.description }}</p>
          }

          <!-- Stats grid -->
          <div class="stats-grid">
            <div class="stat">
              <div class="stat-value">
                <span class="current">{{ tournament.participantCount }}</span>
                <span class="separator">/</span>
                <span class="max">{{ tournament.maxParticipants }}</span>
              </div>
              <div class="stat-label">Players</div>
            </div>
            <div class="stat">
              <div class="stat-value format">{{ formatName(tournament.format) }}</div>
              <div class="stat-label">Format</div>
            </div>
            <div class="stat">
              <div class="stat-value status" [class]="'status-' + tournament.status.toLowerCase()">
                {{ statusLabel(tournament.status) }}
              </div>
              <div class="stat-label">Status</div>
            </div>
          </div>

          <!-- Progress bar for registration -->
          @if (tournament.status === 'REGISTRATION') {
            <div class="registration-progress">
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="(tournament.participantCount / tournament.maxParticipants) * 100"></div>
              </div>
              <div class="progress-label">
                {{ tournament.maxParticipants - tournament.participantCount }} spots remaining
              </div>
            </div>
          }

          <!-- Action buttons -->
          <div class="actions">
            @if (tournament.status === 'REGISTRATION' && isLoggedIn) {
              <button class="btn-primary" (click)="viewTournament()">
                <mat-icon>emoji_events</mat-icon>
                View & Sign Up
              </button>
            } @else {
              <button class="btn-primary" (click)="viewTournament()">
                <mat-icon>visibility</mat-icon>
                View Tournament
              </button>
            }
            <button class="btn-secondary" (click)="close()">
              Maybe Later
            </button>
          </div>

          <!-- Hosted by -->
          <div class="hosted-by">
            Hosted by <span class="host-name">{{ tournament.createdBy.username }}</span>
          </div>
        </div>

        <!-- Close button -->
        <button class="close-btn" (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      } @else {
        <div class="no-tournament">
          <mat-icon>emoji_events</mat-icon>
          <p>No active tournaments right now</p>
          <button class="btn-secondary" (click)="close()">Close</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .spotlight-modal {
      position: relative;
      width: 480px;
      max-width: 90vw;
      min-height: 400px;
      overflow: hidden;
      background: #0d0d0d;
    }

    .spotlight-modal.loading {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-state {
      padding: 80px;
    }

    /* Background layers */
    .bg-image {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.4;
      filter: blur(2px) saturate(1.2);
    }

    .bg-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(13, 13, 13, 0.3) 0%,
        rgba(13, 13, 13, 0.7) 40%,
        rgba(13, 13, 13, 0.95) 100%
      );
    }

    .scanlines {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 2px,
        rgba(0, 0, 0, 0.1) 2px,
        rgba(0, 0, 0, 0.1) 4px
      );
      pointer-events: none;
    }

    .noise {
      position: absolute;
      inset: 0;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      pointer-events: none;
    }

    /* Particles */
    .particles {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: var(--theme-primary-bright, #64b5f6);
      border-radius: 50%;
      bottom: -10px;
      left: var(--x);
      opacity: 0;
      box-shadow: 0 0 10px var(--theme-primary-bright, #64b5f6);
      animation: float-up 4s ease-out infinite;
      animation-delay: var(--delay);
    }

    @keyframes float-up {
      0% {
        opacity: 0;
        transform: translateY(0) scale(1);
      }
      10% {
        opacity: 0.8;
      }
      90% {
        opacity: 0.8;
      }
      100% {
        opacity: 0;
        transform: translateY(-500px) scale(0);
      }
    }

    /* Content */
    .modal-content {
      position: relative;
      padding: 32px 28px 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .spotlight-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 87, 34, 0.2) 100%);
      border: 1px solid rgba(255, 152, 0, 0.4);
      border-radius: 20px;
      margin-bottom: 20px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #ff9800;
      }

      span {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: #ff9800;
      }
    }

    .tournament-name {
      margin: 0 0 16px;
      font-size: 28px;
      font-weight: 800;
      color: white;
      text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
      line-height: 1.2;
    }

    .meta-pills {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--theme-primary-bright, #64b5f6);
      }
    }

    .description {
      margin: 0 0 20px;
      font-size: 14px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.7);
      max-width: 380px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      width: 100%;
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: white;

      .current {
        color: var(--theme-primary-bright, #64b5f6);
      }

      .separator {
        color: rgba(255, 255, 255, 0.3);
        margin: 0 2px;
      }

      .max {
        color: rgba(255, 255, 255, 0.5);
      }

      &.format {
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      &.status {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      &.status-registration {
        background: rgba(76, 175, 80, 0.2);
        color: #81c784;
      }

      &.status-in_progress {
        background: rgba(255, 152, 0, 0.2);
        color: #ffb74d;
      }

      &.status-completed {
        background: rgba(96, 125, 139, 0.2);
        color: #90a4ae;
      }
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.4);
    }

    .registration-progress {
      width: 100%;
      margin-bottom: 24px;
    }

    .progress-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--theme-primary, #1976d2) 0%, var(--theme-primary-bright, #64b5f6) 100%);
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .progress-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      margin-bottom: 16px;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 16px 24px;
      background: linear-gradient(135deg, var(--theme-primary, #1976d2) 0%, var(--theme-primary-bright, #64b5f6) 100%);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 20px rgba(var(--theme-primary-rgb, 25, 118, 210), 0.4);
      font-family: inherit;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 28px rgba(var(--theme-primary-rgb, 25, 118, 210), 0.5);
      }
    }

    .btn-secondary {
      width: 100%;
      padding: 14px 24px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.25);
        color: white;
      }
    }

    .hosted-by {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);

      .host-name {
        color: var(--theme-primary-bright, #64b5f6);
        font-weight: 500;
      }
    }

    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 36px;
      height: 36px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 10;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border-color: rgba(255, 255, 255, 0.2);
      }
    }

    .no-tournament {
      padding: 60px 40px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: rgba(255, 255, 255, 0.2);
      }

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.5);
        font-size: 16px;
      }
    }

    @media (max-width: 520px) {
      .spotlight-modal {
        width: 100%;
      }

      .modal-content {
        padding: 28px 20px 24px;
      }

      .tournament-name {
        font-size: 24px;
      }

      .stats-grid {
        gap: 12px;
        padding: 12px;
      }

      .stat-value {
        font-size: 16px;

        &.format {
          font-size: 12px;
        }
      }
    }
  `]
})
export class TournamentSpotlightModalComponent implements OnInit {
  tournament: Tournament | null = null;
  loading = true;
  particles = Array.from({ length: 8 }, (_, i) => i);

  private gameImages: Record<string, string> = {
    'Bo2': '/assets/games/bo2.webp',
    'Bo3': '/assets/games/bo3.jpg',
    'MW2': '/assets/games/mw2.jpg',
    'MW3': '/assets/games/mw3.webp',
    'Ghosts': '/assets/games/ghosts.webp',
  };

  constructor(
    private dialogRef: MatDialogRef<TournamentSpotlightModalComponent>,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { tournament?: Tournament }
  ) {}

  get isLoggedIn(): boolean {
    return !!this.authService.currentUser();
  }

  ngOnInit(): void {
    if (this.data?.tournament) {
      this.tournament = this.data.tournament;
      this.loading = false;
    } else {
      this.loadLatestTournament();
    }
  }

  loadLatestTournament(): void {
    this.http.get<Tournament[]>(`${environment.apiUrl}/tournaments`).subscribe({
      next: (tournaments) => {
        // Find the most recent active tournament (registration or in progress)
        const activeTournament = tournaments.find(
          t => t.status === 'REGISTRATION' || t.status === 'IN_PROGRESS'
        );
        this.tournament = activeTournament || tournaments[0] || null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getGameImage(): string {
    if (!this.tournament) return '';
    return this.gameImages[this.tournament.game.name] || '/assets/games/bo2.webp';
  }

  getRandomX(index: number): string {
    const positions = [10, 25, 40, 55, 70, 85, 15, 60];
    return positions[index % positions.length] + '%';
  }

  formatName(format: string): string {
    return format.replace(/_/g, ' ');
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'REGISTRATION': return 'Open';
      case 'IN_PROGRESS': return 'Live';
      case 'COMPLETED': return 'Ended';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }

  viewTournament(): void {
    if (this.tournament) {
      this.dialogRef.close();
      this.router.navigate(['/tournaments', this.tournament.id]);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
