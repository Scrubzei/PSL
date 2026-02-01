import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { GamesService } from '../games/games.service';

interface ChallengeData {
  opponent: { id: string; username: string };
  game: string;
  platform: string;
  type: 'RANKED' | 'XP';
}

@Component({
  selector: 'app-leaderboard-challenge-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Challenge {{ data.opponent.username }}</h2>
    <mat-dialog-content>
      <div class="challenge-info">
        <span class="badge">{{ data.game }}</span>
        <span class="badge">{{ data.platform }}</span>
        <span class="badge type" [class.ranked]="data.type === 'RANKED'" [class.xp]="data.type === 'XP'">
          {{ data.type }}
        </span>
      </div>

      @if (data.type === 'RANKED') {
        <div class="ranked-disabled-message">
          <mat-icon>info</mat-icon>
          <p>Ranks have not been set yet. XP games can be played in the meantime.</p>
        </div>
      }

      @if (data.type !== 'RANKED') {
      <form [formGroup]="challengeForm" class="form-fields">
        <mat-form-field appearance="outline">
          <mat-label>Best of</mat-label>
          <mat-select formControlName="bestOf" (selectionChange)="onBestOfChange($event.value)">
            @for (option of bestOfOptions; track option) {
              <mat-option [value]="option">{{ option }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        @if (mapsArray.length > 0) {
          <div class="maps-section">
            <h4>Select Maps</h4>
            @for (mapControl of mapsArray.controls; track $index) {
              <mat-form-field appearance="outline">
                <mat-label>Map {{ $index + 1 }}</mat-label>
                <mat-select [formControl]="getMapControl($index)">
                  @for (map of maps; track map) {
                    <mat-option [value]="map">{{ map }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
          </div>
        }
      </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      <span class="spacer"></span>
      <button mat-button (click)="onCancel()">Cancel</button>
      @if (data.type !== 'RANKED') {
        <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!challengeForm.valid">
          Send Challenge
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }

    ::ng-deep .mat-mdc-dialog-content {
      padding-bottom: 16px !important;
    }

    ::ng-deep .mat-mdc-dialog-actions {
      padding: 16px 24px 20px !important;
    }

    .challenge-info {
      display: flex;
      gap: 10px;
      margin-bottom: 32px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.8);
    }

    .badge.type {
      border-color: var(--theme-primary, #bf2120);
      color: var(--theme-primary-bright, #ff4444);
    }

    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-fields mat-form-field {
      width: 100%;
    }

    .maps-section {
      margin-top: 8px;
    }

    .maps-section h4 {
      margin: 0 0 12px 0;
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .spacer {
      flex: 1;
    }

    .ranked-disabled-message {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 16px;

      mat-icon {
        color: rgba(255, 255, 255, 0.6);
        flex-shrink: 0;
      }

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        line-height: 1.5;
      }
    }
  `]
})
export class LeaderboardChallengeModalComponent implements OnInit {
  challengeForm: FormGroup;
  bestOfOptions = [1, 3, 5, 7, 9];
  maps: string[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<LeaderboardChallengeModalComponent>,
    private gamesService: GamesService,
    @Inject(MAT_DIALOG_DATA) public data: ChallengeData
  ) {
    this.challengeForm = this.fb.group({
      bestOf: [3, Validators.required],
      maps: this.fb.array([])
    });
    this.onBestOfChange(3);
  }

  ngOnInit(): void {
    this.gamesService.getMapsByGame(this.data.game).subscribe(gameMaps => {
      this.maps = ['Random', ...gameMaps.map(m => m.mapName)];
    });
  }

  get mapsArray(): FormArray {
    return this.challengeForm.get('maps') as FormArray;
  }

  getMapControl(index: number): FormControl {
    return this.mapsArray.at(index) as FormControl;
  }

  onBestOfChange(value: number): void {
    this.mapsArray.clear();
    for (let i = 0; i < value; i++) {
      this.mapsArray.push(this.fb.control('', Validators.required));
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.challengeForm.valid) {
      const result = {
        opponent: this.data.opponent,
        game: this.data.game,
        platform: this.data.platform,
        type: this.data.type,
        ...this.challengeForm.value
      };
      this.dialogRef.close(result);
    }
  }
}
