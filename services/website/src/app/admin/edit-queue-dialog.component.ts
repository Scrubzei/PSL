import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../environments/environment';

interface Channel { id: string; name: string; }

@Component({
  selector: 'app-edit-queue-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>Edit Queue</h2>
    <mat-dialog-content>
      <div class="form">
        <div class="field">
          <label>Title</label>
          <input type="text" [(ngModel)]="title" />
        </div>

        <div class="field">
          <label>Queue Channel</label>
          <select [(ngModel)]="channelId">
            @for (ch of channels; track ch.id) {
              <option [value]="ch.id">#{{ ch.name }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label>Match Thread Channel</label>
          <select [(ngModel)]="matchThreadChannelId">
            <option value="">Global default</option>
            @for (ch of channels; track ch.id) {
              <option [value]="ch.id">#{{ ch.name }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label>Result Channels</label>
          <div class="maps-list">
            @for (ch of channels; track ch.id) {
              <label class="map-checkbox">
                <input type="checkbox" [checked]="resultChannelIds.has(ch.id)" (change)="toggleResultChannel(ch.id)" />
                #{{ ch.name }}
              </label>
            }
          </div>
          @if (resultChannelIds.size === 0) {
            <p class="hint">None selected — will use global game feed</p>
          }
        </div>

        <div class="field">
          <label>Maps</label>
          <div class="maps-list">
            @for (map of availableMaps; track map.name) {
              <label class="map-checkbox">
                <input type="checkbox" [(ngModel)]="map.selected" />
                {{ map.name }}
              </label>
            }
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="!title.trim() || selectedMaps.length === 0 || saving"
        (click)="save()"
      >
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 16px; min-width: 400px; }

    .field {
      display: flex; flex-direction: column; gap: 6px;

      label {
        font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.5);
        text-transform: uppercase; letter-spacing: 0.5px;
      }

      select, input {
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px; color: white; font-size: 14px; font-family: inherit;
        &:focus { outline: none; border-color: rgba(37, 99, 235, 0.5); }
        option { background: #1a1a1a; color: white; }
      }
    }

    .maps-list { display: flex; flex-wrap: wrap; gap: 8px; }

    .map-checkbox {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: rgba(255, 255, 255, 0.8); cursor: pointer;
      input { cursor: pointer; }
    }

    .hint { font-size: 12px; color: rgba(255, 255, 255, 0.3); margin: 4px 0 0; }
  `],
})
export class EditQueueDialogComponent implements OnInit {
  title = '';
  channelId = '';
  matchThreadChannelId = '';
  resultChannelIds = new Set<string>();
  channels: Channel[] = [];
  availableMaps: { name: string; selected: boolean }[] = [];
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<EditQueueDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      queue: any;
      channels: Channel[];
      allMaps: string[];
    },
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.title = this.data.queue.title;
    this.channelId = this.data.queue.channelId;
    this.matchThreadChannelId = this.data.queue.matchThreadChannelId || '';
    this.resultChannelIds = new Set(this.data.queue.resultChannelIds || []);
    this.channels = this.data.channels;
    this.availableMaps = this.data.allMaps.map((name: string) => ({
      name,
      selected: this.data.queue.maps.includes(name),
    }));
  }

  get selectedMaps(): string[] {
    return this.availableMaps.filter((m) => m.selected).map((m) => m.name);
  }

  toggleResultChannel(channelId: string): void {
    if (this.resultChannelIds.has(channelId)) {
      this.resultChannelIds.delete(channelId);
    } else {
      this.resultChannelIds.add(channelId);
    }
  }

  save(): void {
    this.saving = true;
    this.http
      .patch(`${environment.apiUrl}/botzei/queues/${this.data.queue.id}`, {
        title: this.title.trim(),
        channelId: this.channelId,
        matchThreadChannelId: this.matchThreadChannelId || undefined,
        resultChannelIds: [...this.resultChannelIds],
        maps: this.selectedMaps,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Queue updated', 'Close', { duration: 2000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.snackBar.open(err.error?.message || 'Failed to update', 'Close', { duration: 3000 });
        },
      });
  }
}
