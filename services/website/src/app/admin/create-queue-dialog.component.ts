import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../environments/environment';

interface Channel { id: string; name: string; }
interface Leaderboard { id: string; game: { name: string }; platform: { name: string }; }
interface Guild { id: string; name: string; }

@Component({
  selector: 'app-create-queue-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>Create Queue</h2>
    <mat-dialog-content>
      <div class="form">
        <div class="field">
          <label>Queue Type</label>
          <select [(ngModel)]="queueType">
            <option value="standard">Standard (ready-up → map pick → report)</option>
            <option value="plutonium">Game Server (auto-connect on pop)</option>
          </select>
        </div>

        <div class="field">
          <label>Server</label>
          <select [(ngModel)]="selectedGuildId" (change)="onGuildChange()">
            <option value="">Select a server</option>
            @for (guild of guilds; track guild.id) {
              <option [value]="guild.id">{{ guild.name }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label>Leaderboard</label>
          <select [(ngModel)]="selectedLeaderboardId" (change)="onLeaderboardChange()">
            <option value="">Select a leaderboard</option>
            @for (lb of leaderboards; track lb.id) {
              <option [value]="lb.id">{{ lb.game.name }} — {{ lb.platform.name }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label>Title</label>
          <input type="text" [(ngModel)]="title" placeholder="e.g. MW2 Snipers 1v1" />
        </div>

        <div class="field">
          <label>Queue Channel</label>
          <select [(ngModel)]="selectedChannelId">
            <option value="">Select a channel</option>
            @for (ch of channels; track ch.id) {
              <option [value]="ch.id">#{{ ch.name }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label>Match Thread Channel</label>
          <select [(ngModel)]="selectedMatchThreadChannelId">
            <option value="">Same as global default</option>
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
            @if (loadingMaps) {
              <p class="hint">Loading maps...</p>
            }
            @for (map of availableMaps; track map.mapName) {
              <label class="map-checkbox">
                <input type="checkbox" [(ngModel)]="map.selected" />
                {{ map.mapName }}
              </label>
            }
            @if (!loadingMaps && availableMaps.length === 0 && selectedLeaderboardId) {
              <p class="hint">No maps found for this game.</p>
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
        [disabled]="!canCreate || creating"
        (click)="create()"
      >
        {{ creating ? 'Creating...' : 'Create Queue' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 16px; min-width: 400px; }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 12px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.5);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      select, input {
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-family: inherit;

        &:focus { outline: none; border-color: rgba(37, 99, 235, 0.5); }
        option { background: #1a1a1a; color: white; }
      }
    }

    .maps-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .map-checkbox {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;

      input { cursor: pointer; }
    }

    .hint {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.3);
      margin: 0;
    }
  `],
})
export class CreateQueueDialogComponent implements OnInit {
  guilds: Guild[] = [];
  leaderboards: Leaderboard[] = [];
  channels: Channel[] = [];
  availableMaps: { mapName: string; selected: boolean }[] = [];
  loadingMaps = false;

  queueType = 'standard';
  selectedGuildId = '';
  selectedLeaderboardId = '';
  selectedChannelId = '';
  selectedMatchThreadChannelId = '';
  resultChannelIds = new Set<string>();
  title = '';
  creating = false;

  // Resolved from leaderboard selection
  gameName = '';
  platformName = '';

  constructor(
    public dialogRef: MatDialogRef<CreateQueueDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { guilds: Guild[] },
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {
    this.guilds = data.guilds || [];
  }

  ngOnInit(): void {
    this.http.get<Leaderboard[]>(`${environment.apiUrl}/leaderboards`).subscribe({
      next: (lbs) => this.leaderboards = lbs,
    });
  }

  get selectedMaps(): string[] {
    return this.availableMaps.filter((m) => m.selected).map((m) => m.mapName);
  }

  get canCreate(): boolean {
    return !!(
      this.selectedGuildId &&
      this.selectedLeaderboardId &&
      this.selectedChannelId &&
      this.title.trim() &&
      this.selectedMaps.length > 0
    );
  }

  toggleResultChannel(channelId: string): void {
    if (this.resultChannelIds.has(channelId)) {
      this.resultChannelIds.delete(channelId);
    } else {
      this.resultChannelIds.add(channelId);
    }
  }

  onGuildChange(): void {
    this.channels = [];
    this.selectedChannelId = '';
    this.selectedMatchThreadChannelId = '';
    if (!this.selectedGuildId) return;

    this.http
      .get<Channel[]>(`${environment.apiUrl}/botzei/guilds/${this.selectedGuildId}/channels`)
      .subscribe({ next: (chs) => (this.channels = chs) });
  }

  onLeaderboardChange(): void {
    this.availableMaps = [];
    const lb = this.leaderboards.find((l) => l.id === this.selectedLeaderboardId);
    if (!lb) return;
    this.gameName = lb.game.name;
    this.platformName = lb.platform.name;

    this.loadingMaps = true;
    this.http
      .get<{ id: string; mapName: string }[]>(
        `${environment.apiUrl}/games/${encodeURIComponent(this.gameName)}/maps`,
      )
      .subscribe({
        next: (maps) => {
          this.availableMaps = maps.map((m) => ({ mapName: m.mapName, selected: false }));
          this.loadingMaps = false;
        },
        error: () => (this.loadingMaps = false),
      });
  }

  create(): void {
    if (!this.canCreate) return;
    this.creating = true;

    this.http
      .post<any>(`${environment.apiUrl}/botzei/queues`, {
        guildId: this.selectedGuildId,
        channelId: this.selectedChannelId,
        queueType: this.queueType,
        matchThreadChannelId: this.selectedMatchThreadChannelId || undefined,
        resultChannelIds: [...this.resultChannelIds],
        leaderboardId: this.selectedLeaderboardId,
        title: this.title.trim(),
        game: this.gameName,
        platform: this.platformName,
        maps: this.selectedMaps,
      })
      .subscribe({
        next: (result) => {
          this.creating = false;
          if (result?.error) {
            this.snackBar.open(result.error, 'Close', { duration: 4000 });
          } else {
            this.snackBar.open('Queue created!', 'Close', { duration: 2000 });
            this.dialogRef.close(true);
          }
        },
        error: (err) => {
          this.creating = false;
          this.snackBar.open(err.error?.message || 'Failed to create queue', 'Close', { duration: 4000 });
        },
      });
  }
}
