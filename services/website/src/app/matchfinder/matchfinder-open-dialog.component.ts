import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { GamesService } from '../games/games.service';

export interface MatchfinderOpenDialogData {
  game: string;
  platform: string;
  gameDisplayName: string;
}

export interface MatchfinderOpenDialogResult {
  bestOf: number;
  selectedMaps: string[];
}

@Component({
  selector: 'app-matchfinder-open-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Open XP match</h2>
    <mat-dialog-content>
      <p class="dialog-lead">
        Post a listing for <strong>{{ data.gameDisplayName }}</strong> ·
        <strong>{{ data.platform }}</strong>. Anyone on the XP ladder can accept.
      </p>
      <form [formGroup]="form" class="form-fields">
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
            <h4>Maps</h4>
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="primary" type="button" (click)="onSubmit()" [disabled]="!form.valid || mapsLoading">
        Post listing
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; }
    .dialog-lead {
      margin: 0 0 16px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.75);
      line-height: 1.5;
    }
    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    mat-form-field { width: 100%; }
    .maps-section h4 {
      margin: 0 0 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.45);
    }
  `],
})
export class MatchfinderOpenDialogComponent implements OnInit {
  form: FormGroup;
  bestOfOptions = [1, 3, 5, 7, 9];
  maps: string[] = [];
  mapsLoading = true;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MatchfinderOpenDialogComponent, MatchfinderOpenDialogResult | undefined>,
    private gamesService: GamesService,
    @Inject(MAT_DIALOG_DATA) public data: MatchfinderOpenDialogData,
  ) {
    this.form = this.fb.group({
      bestOf: [3, Validators.required],
      maps: this.fb.array([]),
    });
    this.onBestOfChange(3);
  }

  ngOnInit(): void {
    this.gamesService.getMapsByGame(this.data.game).subscribe({
      next: (gameMaps) => {
        this.maps = ['Random', ...gameMaps.map((m) => m.mapName)];
        this.mapsLoading = false;
      },
      error: () => {
        this.maps = ['Random'];
        this.mapsLoading = false;
      },
    });
  }

  get mapsArray(): FormArray {
    return this.form.get('maps') as FormArray;
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
    if (this.form.valid) {
      const selectedMaps = this.mapsArray.controls.map((c) => (c as FormControl).value as string);
      this.dialogRef.close({
        bestOf: this.form.value.bestOf,
        selectedMaps,
      });
    }
  }
}
