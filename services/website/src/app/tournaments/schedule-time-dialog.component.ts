import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TournamentsService } from './tournaments.service';

export interface ScheduleTimeDialogData {
  matchId: string;
  currentTime: string | null;
}

@Component({
  selector: 'app-schedule-time-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>schedule</mat-icon>
      Schedule Match
    </h2>
    <mat-dialog-content>
      <div class="time-field">
        <label class="field-label">Date & Time (Central Time)</label>
        <input type="datetime-local"
               class="datetime-input"
               [(ngModel)]="dateTimeValue"
               [min]="minDateTime" />
      </div>
      <p class="timezone-note">All times are in Central Time (CT)</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (currentTime) {
        <button mat-button class="clear-btn" (click)="clear()" [disabled]="saving">Clear</button>
      }
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!dateTimeValue || saving" (click)="save()">
        @if (saving) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          Save
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

    .time-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .datetime-input {
      width: 100%;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;

      &:focus {
        border-color: var(--theme-primary);
      }

      &::-webkit-calendar-picker-indicator {
        filter: invert(1);
        cursor: pointer;
      }
    }

    .timezone-note {
      margin: 10px 0 0;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.35);
    }

    .clear-btn {
      color: #ef5350;
      margin-right: auto !important;
    }

    mat-dialog-actions {
      padding: 16px;
    }
  `]
})
export class ScheduleTimeDialogComponent {
  dateTimeValue = '';
  currentTime: string | null;
  minDateTime: string;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<ScheduleTimeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ScheduleTimeDialogData,
    private tournamentsService: TournamentsService,
  ) {
    this.currentTime = data.currentTime;

    // Pre-fill with current time converted to Central Time
    if (data.currentTime) {
      this.dateTimeValue = this.utcToCentralInput(data.currentTime);
    }

    // Set min to now in Central Time
    this.minDateTime = this.utcToCentralInput(new Date().toISOString());
  }

  /** Convert a UTC ISO string to a datetime-local value in Central Time */
  private utcToCentralInput(isoString: string): string {
    const ct = new Date(isoString).toLocaleString('sv-SE', { timeZone: 'America/Chicago' });
    // sv-SE gives "YYYY-MM-DD HH:MM:SS", convert to "YYYY-MM-DDTHH:MM"
    return ct.replace(' ', 'T').slice(0, 16);
  }

  /** Convert a Central Time datetime-local value to a UTC ISO string */
  private centralInputToUtc(localValue: string): string {
    // Build a date string that we interpret as Central Time
    // Intl approach: format offset, then adjust
    const parts = localValue.split('T');
    const [year, month, day] = parts[0].split('-').map(Number);
    const [hours, minutes] = parts[1].split(':').map(Number);

    // Create a date formatter to find the Central Time offset
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      timeZoneName: 'shortOffset',
    });
    // Use a reference date close to the target to get correct DST offset
    const refDate = new Date(year, month - 1, day, hours, minutes);
    const formatted = formatter.format(refDate);
    // Extract offset like "GMT-6" or "GMT-5"
    const offsetMatch = formatted.match(/GMT([+-]\d+)/);
    const offsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : -6;

    // Build UTC date by subtracting the offset
    const utc = new Date(Date.UTC(year, month - 1, day, hours - offsetHours, minutes));
    return utc.toISOString();
  }

  save(): void {
    if (!this.dateTimeValue) return;

    this.saving = true;
    const utcIso = this.centralInputToUtc(this.dateTimeValue);

    this.tournamentsService.updateMatchScheduledTime(this.data.matchId, utcIso).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => { this.saving = false; },
    });
  }

  clear(): void {
    this.saving = true;
    this.tournamentsService.updateMatchScheduledTime(this.data.matchId, null).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => { this.saving = false; },
    });
  }
}
