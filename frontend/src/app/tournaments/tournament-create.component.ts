import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TournamentsService } from './tournaments.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Game {
  id: string;
  name: string;
}

interface Platform {
  id: string;
  name: string;
}

@Component({
  selector: 'app-tournament-create',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="create-container">
      <div class="header">
        <button mat-icon-button routerLink="/tournaments">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Create Tournament</h1>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Tournament Name</mat-label>
              <input matInput formControlName="name" placeholder="e.g., Summer Championship 2024">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description (Optional)</mat-label>
              <textarea matInput formControlName="description" rows="3" placeholder="Tournament description..."></textarea>
            </mat-form-field>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Game</mat-label>
                <mat-select formControlName="gameId">
                  @for (game of games; track game.id) {
                    <mat-option [value]="game.id">{{ game.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Platform</mat-label>
                <mat-select formControlName="platformId">
                  @for (platform of platforms; track platform.id) {
                    <mat-option [value]="platform.id">{{ platform.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Format</mat-label>
                <mat-select formControlName="format">
                  <mat-option value="SINGLE_ELIMINATION">Single Elimination</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Max Participants</mat-label>
                <mat-select formControlName="maxParticipants">
                  <mat-option [value]="4">4 Players</mat-option>
                  <mat-option [value]="8">8 Players</mat-option>
                  <mat-option [value]="16">16 Players</mat-option>
                  <mat-option [value]="32">32 Players</mat-option>
                  <mat-option [value]="64">64 Players</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="actions">
              <button mat-button type="button" routerLink="/tournaments">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || submitting">
                @if (submitting) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Create Tournament
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .create-container {
      padding: 24px;
      max-width: 600px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;

      h1 {
        margin: 0;
        color: white;
      }
    }

    mat-card {
      padding: 24px;
    }

    .full-width {
      width: 100%;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      mat-form-field {
        width: 100%;
      }
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #2d2d2d;

      button mat-spinner {
        display: inline-block;
      }
    }
  `]
})
export class TournamentCreateComponent implements OnInit {
  form: FormGroup;
  games: Game[] = [];
  platforms: Platform[] = [];
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private tournamentsService: TournamentsService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      gameId: ['', Validators.required],
      platformId: ['', Validators.required],
      format: ['SINGLE_ELIMINATION', Validators.required],
      maxParticipants: [8, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadGamesAndPlatforms();
  }

  loadGamesAndPlatforms(): void {
    this.http.get<Game[]>(`${environment.apiUrl}/games`).subscribe({
      next: (games) => this.games = games,
    });
    this.http.get<Platform[]>(`${environment.apiUrl}/platforms`).subscribe({
      next: (platforms) => this.platforms = platforms,
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    this.submitting = true;
    this.tournamentsService.create(this.form.value).subscribe({
      next: (tournament) => {
        this.snackBar.open('Tournament created!', 'Close', { duration: 3000 });
        this.router.navigate(['/tournaments', tournament.id]);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to create tournament', 'Close', { duration: 3000 });
        this.submitting = false;
      }
    });
  }
}
