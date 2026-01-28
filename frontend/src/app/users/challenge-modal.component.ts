import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { UserProfile } from './users.service';
import { GamesService } from '../games/games.service';

@Component({
  selector: 'app-challenge-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Challenge {{ data.username }}</h2>
    <mat-dialog-content>
      @if (!selectedType) {
        <div class="challenge-options">
          <mat-card class="challenge-card" (click)="selectChallengeType('RANK')">
            <mat-card-content>
              <mat-icon class="challenge-icon">emoji_events</mat-icon>
              <h3>RANK</h3>
              <p class="description">Competitive ranked match that affects your ladder position</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="challenge-card" (click)="selectChallengeType('XP')">
            <mat-card-content>
              <mat-icon class="challenge-icon">stars</mat-icon>
              <h3>XP</h3>
              <p class="description">Casual match to earn experience points and level up</p>
            </mat-card-content>
          </mat-card>
        </div>
      }

      @if (selectedType === 'RANK') {
        <div class="challenge-form">
          <h3>RANK Challenge</h3>
          <form [formGroup]="challengeForm" class="form-fields">
            <mat-form-field appearance="outline">
              <mat-label>Platform</mat-label>
              <mat-select formControlName="platform">
                @for (platform of platforms; track platform) {
                  <mat-option [value]="platform">{{ platform }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Game</mat-label>
              <mat-select formControlName="game">
                @for (game of games; track game) {
                  <mat-option [value]="game">{{ game }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

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
        </div>
      }

      @if (selectedType === 'XP') {
        <div class="challenge-form">
          <h3>XP Challenge</h3>
          <form [formGroup]="challengeForm" class="form-fields">
            <mat-form-field appearance="outline">
              <mat-label>Platform</mat-label>
              <mat-select formControlName="platform">
                @for (platform of platforms; track platform) {
                  <mat-option [value]="platform">{{ platform }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Game</mat-label>
              <mat-select formControlName="game">
                @for (game of games; track game) {
                  <mat-option [value]="game">{{ game }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

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
        </div>
      }

    </mat-dialog-content>
    <mat-dialog-actions>
      @if (selectedType) {
        <button mat-button (click)="onBack()">Back</button>
      }
      <span class="spacer"></span>
      <button mat-button (click)="onCancel()">Cancel</button>
      @if (selectedType) {
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

    .challenge-options {
      display: flex;
      gap: 16px;
      padding: 20px 0;
      flex-wrap: wrap;
    }

    .challenge-card {
      flex: 1;
      min-width: 150px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .challenge-card:hover {
      transform: translateY(-4px);
      border-color: var(--theme-primary, #bf2120);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .challenge-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--theme-primary-bright, #ff4444);
      margin-bottom: 8px;
    }

    .challenge-card h3 {
      margin: 8px 0;
      font-weight: 600;
      color: #e0e0e0;
    }

    .description {
      font-size: 14px;
      color: #b0b0b0;
      margin: 0;
      line-height: 1.4;
    }

    .challenge-form {
      padding: 16px 0;
    }

    .challenge-form h3 {
      margin: 0 0 16px 0;
      color: var(--theme-primary-bright, #ff4444);
      font-size: 16px;
      font-weight: 600;
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
  `]
})
export class ChallengeModalComponent implements OnInit {
  selectedType: string | null = null;
  challengeForm: FormGroup;

  platforms = ['Plutonium', 'Xbox', 'PS3'];
  games = ['Bo2', 'Mw3', 'Mw2', 'Bo1'];
  bestOfOptions = [1, 3, 5, 7, 9];
  maps: string[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ChallengeModalComponent>,
    private gamesService: GamesService,
    @Inject(MAT_DIALOG_DATA) public data: UserProfile
  ) {
    this.challengeForm = this.fb.group({
      platform: ['Plutonium', Validators.required],
      game: ['Bo2', Validators.required],
      bestOf: [3, Validators.required],
      maps: this.fb.array([])
    });
    this.onBestOfChange(3);
  }

  ngOnInit(): void {
    this.loadMapsForGame('Bo2');

    this.challengeForm.get('game')?.valueChanges.subscribe(game => {
      if (game) {
        this.loadMapsForGame(game);
      }
    });
  }

  private loadMapsForGame(gameName: string): void {
    this.gamesService.getMapsByGame(gameName).subscribe(gameMaps => {
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

  selectChallengeType(type: string): void {
    this.selectedType = type;
    this.challengeForm.reset({ platform: 'Plutonium', game: 'Bo2', bestOf: 3 });
    this.onBestOfChange(3);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onBack(): void {
    this.selectedType = null;
    this.challengeForm.reset({ platform: 'Plutonium', game: 'Bo2', bestOf: 3 });
    this.onBestOfChange(3);
  }

  onSubmit(): void {
    if (this.challengeForm.valid) {
      const result = {
        type: this.selectedType,
        opponent: this.data,
        ...this.challengeForm.value
      };
      this.dialogRef.close(result);
    }
  }
}
