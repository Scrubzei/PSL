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

interface RoundDeadline {
  name: string;
  deadline: string;
}

interface PrizeEntry {
  place: number;
  prize: string;
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
              <mat-label>URL Slug</mat-label>
              <input matInput formControlName="slug" placeholder="e.g., summer-cup-2024">
              <mat-hint>Lowercase letters, numbers, and hyphens only</mat-hint>
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

            <div class="section-label">Dates</div>

            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Registration Deadline</mat-label>
                <input matInput [matDatepicker]="regPicker" formControlName="registrationDeadline">
                <mat-datepicker-toggle matIconSuffix [for]="regPicker"></mat-datepicker-toggle>
                <mat-datepicker #regPicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Start Date</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="startDate">
                <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
              </mat-form-field>
            </div>

            @if (roundDeadlinesList.length > 0) {
              <div class="section-label">Round Deadlines</div>
              <div class="round-deadlines">
                @for (round of roundDeadlinesList; track round.name; let i = $index) {
                  <div class="round-row">
                    <span class="round-name">{{ round.name }}</span>
                    <input
                      type="date"
                      class="deadline-input"
                      [value]="round.deadline"
                      (change)="onDeadlineChange(i, $event)"
                    >
                  </div>
                }
              </div>
            }

            <div class="section-label">Prize Pool (Optional)</div>
            <div class="prize-pool-rows">
              @for (entry of prizePoolList; track entry.place; let i = $index) {
                <div class="prize-row">
                  <span class="prize-place">{{ getPlaceLabel(entry.place) }}</span>
                  <input
                    type="text"
                    class="prize-input"
                    placeholder="e.g. $200"
                    [value]="entry.prize"
                    (input)="onPrizeChange(i, $event)"
                  >
                  @if (i === prizePoolList.length - 1 && prizePoolList.length > 1) {
                    <button type="button" class="prize-remove-btn" (click)="removePrizeRow()">
                      <mat-icon>close</mat-icon>
                    </button>
                  }
                </div>
              }
              <button type="button" class="add-prize-btn" (click)="addPrizeRow()">
                <mat-icon>add</mat-icon> Add Place
              </button>
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

    .section-label {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
      margin: 8px 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .round-deadlines {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }

    .round-row {
      display: flex;
      align-items: center;
      gap: 16px;

      .round-name {
        min-width: 140px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.85);
      }

      .deadline-input {
        flex: 1;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-family: inherit;
        outline: none;
        color-scheme: dark;

        &:focus {
          border-color: rgba(255, 255, 255, 0.3);
        }
      }
    }

    .prize-pool-rows {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }

    .prize-row {
      display: flex;
      align-items: center;
      gap: 16px;

      .prize-place {
        min-width: 60px;
        font-size: 14px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.85);
      }

      .prize-input {
        flex: 1;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-family: inherit;
        outline: none;

        &:focus {
          border-color: rgba(255, 255, 255, 0.3);
        }
      }

      .prize-remove-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        padding: 4px;
        display: flex;

        &:hover {
          color: #ef4444;
        }

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .add-prize-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.5);
      padding: 8px 16px;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;

      &:hover {
        border-color: rgba(255, 255, 255, 0.3);
        color: rgba(255, 255, 255, 0.7);
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
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
  roundDeadlinesList: RoundDeadline[] = [];
  prizePoolList: PrizeEntry[] = [
    { place: 1, prize: '' },
    { place: 2, prize: '' },
    { place: 3, prize: '' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private tournamentsService: TournamentsService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)]],
      description: [''],
      gameId: ['', Validators.required],
      platformId: ['', Validators.required],
      format: ['SINGLE_ELIMINATION', Validators.required],
      maxParticipants: [8, Validators.required],
      registrationDeadline: [null],
      startDate: [null],
    });

    this.form.get('maxParticipants')!.valueChanges.subscribe((value) => {
      this.buildRoundDeadlines(value);
    });

    this.buildRoundDeadlines(8);
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

  buildRoundDeadlines(maxParticipants: number): void {
    const numRounds = Math.log2(maxParticipants);
    const names = this.getRoundNames(numRounds);
    this.roundDeadlinesList = names.map(name => ({ name, deadline: '' }));
  }

  getRoundNames(numRounds: number): string[] {
    const names: string[] = [];
    for (let round = numRounds; round >= 1; round--) {
      if (round === 1) names.push('Finals');
      else if (round === 2) names.push('Semi Finals');
      else if (round === 3) names.push('Quarter Finals');
      else names.push(`Round ${numRounds - round + 1}`);
    }
    return names;
  }

  onDeadlineChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.roundDeadlinesList[index].deadline = input.value;
  }

  getPlaceLabel(place: number): string {
    if (place === 1) return '1st';
    if (place === 2) return '2nd';
    if (place === 3) return '3rd';
    return `${place}th`;
  }

  onPrizeChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.prizePoolList[index].prize = input.value;
  }

  addPrizeRow(): void {
    const nextPlace = this.prizePoolList.length + 1;
    this.prizePoolList.push({ place: nextPlace, prize: '' });
  }

  removePrizeRow(): void {
    if (this.prizePoolList.length > 1) {
      this.prizePoolList.pop();
    }
  }

  submit(): void {
    if (this.form.invalid) return;

    this.submitting = true;
    const value = this.form.value;

    const dto: any = {
      name: value.name,
      slug: value.slug,
      description: value.description || undefined,
      gameId: value.gameId,
      platformId: value.platformId,
      format: value.format,
      maxParticipants: value.maxParticipants,
    };

    if (value.registrationDeadline) {
      dto.registrationDeadline = new Date(value.registrationDeadline).toISOString();
    }
    if (value.startDate) {
      dto.startDate = new Date(value.startDate).toISOString();
    }

    // Always include round deadlines - blank dates show as TBD
    dto.roundDeadlines = this.roundDeadlinesList.map(r => ({
      name: r.name,
      deadline: r.deadline ? new Date(r.deadline + 'T23:59:59').toISOString() : null,
    }));

    // Include prize pool entries that have a prize value
    const prizes = this.prizePoolList.filter(p => p.prize.trim());
    if (prizes.length > 0) {
      dto.prizePool = prizes;
    }

    this.tournamentsService.create(dto).subscribe({
      next: (tournament) => {
        this.snackBar.open('Tournament created!', 'Close', { duration: 3000 });
        this.router.navigate(['/tournaments', tournament.slug]);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to create tournament', 'Close', { duration: 3000 });
        this.submitting = false;
      }
    });
  }
}
