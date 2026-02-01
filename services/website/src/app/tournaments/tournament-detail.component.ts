import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TournamentsService, TournamentDetail } from './tournaments.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="tournament-detail-container">
      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading tournament...</p>
        </div>
      } @else if (tournament) {
        <div class="header">
          <div class="title-section">
            <button mat-icon-button routerLink="/tournaments">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1>{{ tournament.name }}</h1>
              <p class="subtitle">{{ tournament.game.name }} - {{ tournament.platform.name }}</p>
            </div>
          </div>
          <div class="actions">
            @if (tournament.status === 'REGISTRATION') {
              @if (!tournament.isSignedUp) {
                <button mat-raised-button color="primary" (click)="signup()" [disabled]="actionLoading">
                  <mat-icon>person_add</mat-icon> Sign Up
                </button>
              } @else {
                <button mat-raised-button color="warn" (click)="withdraw()" [disabled]="actionLoading">
                  <mat-icon>person_remove</mat-icon> Withdraw
                </button>
              }
            }
            @if ((tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') && (tournament.isSignedUp || isAdmin)) {
              <button mat-raised-button color="accent" [routerLink]="['/tournaments', tournament.id, 'bracket']">
                <mat-icon>account_tree</mat-icon> View Bracket
              </button>
            }
            @if (isAdmin && tournament.status === 'REGISTRATION' && tournament.participants.length >= 2) {
              <button mat-raised-button color="accent" (click)="startTournament()" [disabled]="actionLoading">
                <mat-icon>play_arrow</mat-icon> Start Tournament
              </button>
            }
          </div>
        </div>

        <div class="content-grid">
          <mat-card class="info-card">
            <mat-card-header>
              <mat-card-title>Tournament Info</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-row">
                <span class="label">Status</span>
                <mat-chip [class]="'status-' + tournament.status.toLowerCase()">
                  {{ statusLabel(tournament.status) }}
                </mat-chip>
              </div>
              <div class="info-row">
                <span class="label">Format</span>
                <span>{{ formatName(tournament.format) }}</span>
              </div>
              <div class="info-row">
                <span class="label">Players</span>
                <span>{{ tournament.participantCount }} / {{ tournament.maxParticipants }}</span>
              </div>
              @if (tournament.description) {
                <div class="info-row description">
                  <span class="label">Description</span>
                  <p>{{ tournament.description }}</p>
                </div>
              }
              @if (tournament.registrationDeadline) {
                <div class="info-row">
                  <span class="label">Registration Deadline</span>
                  <span>{{ tournament.registrationDeadline | date:'medium' }}</span>
                </div>
              }
              @if (tournament.startDate) {
                <div class="info-row">
                  <span class="label">Start Date</span>
                  <span>{{ tournament.startDate | date:'medium' }}</span>
                </div>
              }
              <div class="info-row">
                <span class="label">Created By</span>
                <span>{{ tournament.createdBy.username }}</span>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="participants-card">
            <mat-card-header>
              <mat-card-title>
                Participants ({{ tournament.participants.length }})
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (tournament.participants.length === 0) {
                <div class="empty-participants">
                  <mat-icon>people_outline</mat-icon>
                  <p>No participants yet</p>
                </div>
              } @else {
                <mat-list>
                  @for (participant of tournament.participants; track participant.id; let i = $index) {
                    <mat-list-item [class.eliminated]="participant.eliminated">
                      <span matListItemTitle>
                        {{ i + 1 }}. {{ participant.user.username }}
                        @if (participant.eliminated) {
                          <mat-icon class="eliminated-icon">close</mat-icon>
                        }
                      </span>
                    </mat-list-item>
                  }
                </mat-list>
              }
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .tournament-detail-container {
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: rgba(255, 255, 255, 0.5);

      p {
        margin-top: 16px;
      }
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;

      .title-section {
        display: flex;
        align-items: center;
        gap: 8px;

        h1 {
          margin: 0;
          color: white;
        }

        .subtitle {
          margin: 4px 0 0;
          color: var(--theme-primary-bright, #64b5f6);
        }
      }

      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .info-card, .participants-card {
      mat-card-header {
        margin-bottom: 16px;
      }

      mat-card-title {
        color: white;
      }
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #2d2d2d;

      &:last-child {
        border-bottom: none;
      }

      .label {
        color: rgba(255, 255, 255, 0.6);
      }

      &.description {
        flex-direction: column;
        align-items: flex-start;

        p {
          margin: 8px 0 0;
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }

    .empty-participants {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      color: rgba(255, 255, 255, 0.5);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }
    }

    mat-list-item {
      &.eliminated {
        opacity: 0.5;
        text-decoration: line-through;
      }

      .eliminated-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #f44336;
        margin-left: 8px;
        vertical-align: middle;
      }
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
export class TournamentDetailComponent implements OnInit {
  tournament: TournamentDetail | null = null;
  loading = true;
  actionLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  get isAdmin(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTournament(id);
    }
  }

  loadTournament(id: string): void {
    this.loading = true;
    this.tournamentsService.getOne(id).subscribe({
      next: (tournament) => {
        this.tournament = tournament;
        this.loading = false;
      },
      error: () => {
        this.snackBar.open('Failed to load tournament', 'Close', { duration: 3000 });
        this.loading = false;
        this.router.navigate(['/tournaments']);
      }
    });
  }

  signup(): void {
    if (!this.tournament) return;
    this.actionLoading = true;
    this.tournamentsService.signup(this.tournament.id).subscribe({
      next: () => {
        this.snackBar.open('Successfully signed up!', 'Close', { duration: 3000 });
        this.loadTournament(this.tournament!.id);
        this.actionLoading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to sign up', 'Close', { duration: 3000 });
        this.actionLoading = false;
      }
    });
  }

  withdraw(): void {
    if (!this.tournament) return;
    this.actionLoading = true;
    this.tournamentsService.withdraw(this.tournament.id).subscribe({
      next: () => {
        this.snackBar.open('Successfully withdrawn', 'Close', { duration: 3000 });
        this.loadTournament(this.tournament!.id);
        this.actionLoading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to withdraw', 'Close', { duration: 3000 });
        this.actionLoading = false;
      }
    });
  }

  startTournament(): void {
    if (!this.tournament) return;
    this.actionLoading = true;
    this.tournamentsService.startTournament(this.tournament.id).subscribe({
      next: () => {
        this.snackBar.open('Tournament started!', 'Close', { duration: 3000 });
        this.loadTournament(this.tournament!.id);
        this.actionLoading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to start tournament', 'Close', { duration: 3000 });
        this.actionLoading = false;
      }
    });
  }

  formatName(format: string): string {
    return format.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'REGISTRATION': return 'Registration Open';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }
}
