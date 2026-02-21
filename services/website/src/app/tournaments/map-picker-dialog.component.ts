import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TournamentsService, GameMap } from './tournaments.service';

export interface MapPickerDialogData {
  matchId: string;
  gameId: string;
  gameName: string;
  currentMaps: GameMap[];
}

@Component({
  selector: 'app-map-picker-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>map</mat-icon>
      Pick Maps
    </h2>
    <mat-dialog-content>
      @if (loading) {
        <div class="loading">
          <mat-spinner diameter="32"></mat-spinner>
          <span>Loading maps...</span>
        </div>
      } @else {
        <div class="map-slots">
          @for (i of [0, 1, 2]; track i) {
            <div class="map-slot">
              <span class="map-label">Map {{ i + 1 }}</span>
              <mat-form-field appearance="outline">
                <mat-select [(ngModel)]="selectedMapIds[i]" placeholder="Select map">
                  @for (map of availableMaps; track map.id) {
                    <mat-option [value]="map.id">{{ map.mapName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!isValid() || saving" (click)="save()">
        @if (saving) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          Save Maps
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        color: var(--theme-primary);
      }
    }

    mat-dialog-content {
      padding-top: 16px;
      min-width: 320px;
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px;
      justify-content: center;
      color: rgba(255, 255, 255, 0.6);
    }

    .map-slots {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .map-slot {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .map-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    mat-form-field {
      width: 100%;
    }

    mat-dialog-actions {
      padding: 16px;
    }
  `]
})
export class MapPickerDialogComponent implements OnInit {
  availableMaps: GameMap[] = [];
  selectedMapIds: (string | null)[] = [null, null, null];
  loading = true;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<MapPickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MapPickerDialogData,
    private tournamentsService: TournamentsService,
  ) {}

  ngOnInit(): void {
    // Pre-fill with current maps
    if (this.data.currentMaps?.length) {
      for (let i = 0; i < Math.min(3, this.data.currentMaps.length); i++) {
        this.selectedMapIds[i] = this.data.currentMaps[i].id;
      }
    }

    // Fetch available maps for this game
    this.tournamentsService.getGameMaps(this.data.gameName).subscribe({
      next: (maps) => {
        this.availableMaps = maps;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  isValid(): boolean {
    return this.selectedMapIds.some(id => id !== null);
  }

  save(): void {
    const mapIds = this.selectedMapIds.filter((id): id is string => id !== null);
    if (mapIds.length === 0) return;

    this.saving = true;
    this.tournamentsService.updateMatchMaps(this.data.matchId, mapIds, this.data.gameId).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
