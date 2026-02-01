import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { TournamentMatch } from './tournaments.service';

@Component({
  selector: 'app-report-result-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatRadioModule,
  ],
  template: `
    <h2 mat-dialog-title>Report Match Result</h2>
    <mat-dialog-content>
      <p>Select the winner of this match:</p>
      <mat-radio-group [(ngModel)]="selectedWinner" class="winner-options">
        @if (data.match.player1) {
          <mat-radio-button [value]="data.match.player1.id">
            {{ data.match.player1.username }}
          </mat-radio-button>
        }
        @if (data.match.player2) {
          <mat-radio-button [value]="data.match.player2.id">
            {{ data.match.player2.username }}
          </mat-radio-button>
        }
      </mat-radio-group>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!selectedWinner" (click)="confirm()">
        Confirm Winner
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding-top: 16px;
    }

    .winner-options {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 16px;

      mat-radio-button {
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        transition: background 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }

    mat-dialog-actions {
      padding: 16px;
    }
  `]
})
export class ReportResultDialogComponent {
  selectedWinner: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<ReportResultDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { match: TournamentMatch },
  ) {}

  confirm(): void {
    if (this.selectedWinner) {
      this.dialogRef.close(this.selectedWinner);
    }
  }
}
