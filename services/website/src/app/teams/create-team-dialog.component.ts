import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TeamsService } from './teams.service';

const GAMES = ['MW2', 'BO1', 'MW3', 'BO2', 'COD4'];
const REGIONS = ['NA', 'EU'];

@Component({
  selector: 'app-create-team-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>Create Team</h2>
    <mat-dialog-content>
      <div class="form">
        <div class="field">
          <label>Team Name</label>
          <input type="text" [(ngModel)]="name" placeholder="e.g. Sloths" maxlength="32" />
        </div>
        <div class="field">
          <label>Tag (2-8 characters)</label>
          <input type="text" [(ngModel)]="tag" placeholder="e.g. SLT" maxlength="8" (input)="tag = tag.toUpperCase()" />
        </div>
        <div class="field">
          <label>Game</label>
          <select [(ngModel)]="game">
            @for (g of games; track g) {
              <option [value]="g">{{ g }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Region</label>
          <select [(ngModel)]="region">
            @for (r of regions; track r) {
              <option [value]="r">{{ r }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Team Color</label>
          <input type="color" [(ngModel)]="color" />
        </div>
        <div class="field">
          <label>Bio (optional)</label>
          <textarea [(ngModel)]="bio" placeholder="Short team description" maxlength="280" rows="2"></textarea>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!canCreate || creating" (click)="create()">
        {{ creating ? 'Creating...' : 'Create Team' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 14px; min-width: 360px; }
    .field {
      display: flex; flex-direction: column; gap: 5px;
      label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; }
      input, select, textarea {
        padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px; color: white; font-size: 14px; font-family: inherit; resize: none;
        &:focus { outline: none; border-color: rgba(124, 58, 237, 0.5); }
        option { background: #1a1a1a; }
      }
      input[type="color"] { height: 40px; padding: 4px; cursor: pointer; }
    }
  `]
})
export class CreateTeamDialogComponent {
  games = GAMES;
  regions = REGIONS;
  name = '';
  tag = '';
  game = 'MW2';
  region = 'NA';
  color = '#7C3AED';
  bio = '';
  creating = false;

  get canCreate(): boolean {
    return this.name.trim().length > 0 && this.tag.trim().length >= 2;
  }

  constructor(
    private dialogRef: MatDialogRef<CreateTeamDialogComponent>,
    private teamsService: TeamsService,
    private snackBar: MatSnackBar,
  ) {}

  create(): void {
    this.creating = true;
    this.teamsService.create({
      name: this.name.trim(),
      tag: this.tag.trim(),
      game: this.game,
      region: this.region,
      color: this.color,
      bio: this.bio.trim() || undefined,
    }).subscribe({
      next: () => {
        this.snackBar.open('Team created!', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.creating = false;
        this.snackBar.open(err.error?.message || 'Failed to create team', 'Close', { duration: 3000 });
      },
    });
  }
}
