import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { Inject } from '@angular/core';
import { environment } from '../../environments/environment';

interface GameServer {
  id: string;
  queueId: string;
  name: string;
  ip: string;
  port: number;
  available: boolean;
}

interface QueueInfo {
  id: string;
  title: string;
  game: string;
  platform: string;
}

// ---------------------------------------------------------------------------
// Add Server Dialog
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-add-server-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Add Game Server</h2>
    <mat-dialog-content>
      <div class="form">
        <div class="field">
          <label>Queue</label>
          <select [(ngModel)]="queueId">
            <option value="">Select a queue</option>
            @for (q of queues; track q.id) {
              <option [value]="q.id">{{ q.title }} ({{ q.game }} · {{ q.platform }})</option>
            }
          </select>
        </div>
        <div class="field">
          <label>Server Name</label>
          <input type="text" [(ngModel)]="name" placeholder="e.g. US East 1" />
        </div>
        <div class="field">
          <label>IP Address</label>
          <input type="text" [(ngModel)]="ip" placeholder="e.g. 192.168.1.1" />
        </div>
        <div class="field">
          <label>Port</label>
          <input type="number" [(ngModel)]="port" placeholder="e.g. 27016" />
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!canSave || saving" (click)="save()">
        {{ saving ? 'Adding...' : 'Add Server' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 16px; min-width: 400px; }
    .field { display: flex; flex-direction: column; gap: 6px;
      label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px; }
      select, input { padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; font-size: 14px; font-family: inherit;
        &:focus { outline: none; border-color: rgba(37,99,235,0.5); }
        option { background: #1a1a1a; color: white; }
      }
    }
  `],
})
export class AddServerDialogComponent {
  queues: QueueInfo[] = [];
  queueId = '';
  name = '';
  ip = '';
  port = 27016;
  saving = false;

  get canSave() { return this.queueId && this.name.trim() && this.ip.trim() && this.port > 0; }

  constructor(
    public dialogRef: MatDialogRef<AddServerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: { queues: QueueInfo[] },
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {
    this.queues = data.queues;
  }

  save(): void {
    this.saving = true;
    this.http.post(`${environment.apiUrl}/botzei/game-servers`, {
      queueId: this.queueId,
      name: this.name.trim(),
      ip: this.ip.trim(),
      port: this.port,
    }).subscribe({
      next: () => { this.saving = false; this.snackBar.open('Server added', 'Close', { duration: 2000 }); this.dialogRef.close(true); },
      error: () => { this.saving = false; this.snackBar.open('Failed to add server', 'Close', { duration: 3000 }); },
    });
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-game-servers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule, MatButtonModule, MatDialogModule],
  template: `
    <div class="page">
      <div class="container">
        <div class="header">
          <div>
            <a routerLink="/admin" class="back-link">&larr; Admin</a>
            <h1>Game Servers</h1>
          </div>
          <button mat-flat-button color="primary" (click)="openAddDialog()">
            <i class="fa-solid fa-plus"></i> Add Server
          </button>
        </div>

        @if (loading) {
          <p class="muted">Loading...</p>
        }

        @if (!loading && servers.length === 0) {
          <p class="muted">No game servers configured.</p>
        }

        <div class="servers-list">
          @for (server of servers; track server.id) {
            <div class="server-card" [class.unavailable]="!server.available">
              <div class="status-dot" [class.online]="server.available"></div>
              <div class="server-info">
                <h3>{{ server.name }}</h3>
                <span class="meta">{{ server.ip }}:{{ server.port }}</span>
                <span class="meta">{{ getQueueTitle(server.queueId) }}</span>
              </div>
              <div class="server-actions">
                <button mat-stroked-button color="warn" (click)="deleteServer(server)">Delete</button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { background: #0a0a0f; min-height: 100%; }
    .container { max-width: 800px; margin: 0 auto; padding: 48px 24px; }
    .header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 32px; gap: 16px;
      h1 { font-size: 28px; font-weight: 700; color: white; margin: 8px 0 0; }
      button i { margin-right: 8px; }
    }
    .back-link { color: rgba(255,255,255,0.4); text-decoration: none; font-size: 13px; font-weight: 500; &:hover { color: white; } }
    .muted { color: rgba(255,255,255,0.3); font-size: 14px; }
    .servers-list { display: flex; flex-direction: column; gap: 10px; }
    .server-card {
      display: flex; align-items: center; gap: 14px; padding: 18px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
      &.unavailable { opacity: 0.5; }
    }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #6b7280; flex-shrink: 0;
      &.online { background: #22c55e; }
    }
    .server-info { flex: 1; min-width: 0;
      h3 { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: white; }
    }
    .meta { font-size: 12px; color: rgba(255,255,255,0.35); margin-right: 12px; }
    .server-actions { flex-shrink: 0; }
  `],
})
export class GameServersComponent implements OnInit {
  servers: GameServer[] = [];
  queues: QueueInfo[] = [];
  loading = true;

  constructor(private http: HttpClient, private snackBar: MatSnackBar, private dialog: MatDialog) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    Promise.all([
      this.http.get<GameServer[]>(`${environment.apiUrl}/botzei/game-servers`).toPromise(),
      this.http.get<QueueInfo[]>(`${environment.apiUrl}/botzei/queues`).toPromise(),
    ]).then(([servers, queues]) => {
      this.servers = servers || [];
      this.queues = queues || [];
      this.loading = false;
    }).catch(() => {
      this.loading = false;
      this.snackBar.open('Failed to load data', 'Close', { duration: 3000 });
    });
  }

  getQueueTitle(queueId: string): string {
    return this.queues.find(q => q.id === queueId)?.title || queueId;
  }

  openAddDialog(): void {
    this.dialog.open(AddServerDialogComponent, {
      width: '480px',
      data: { queues: this.queues },
    }).afterClosed().subscribe(result => { if (result) this.loadData(); });
  }

  deleteServer(server: GameServer): void {
    if (!confirm(`Delete server "${server.name}"?`)) return;
    this.http.delete(`${environment.apiUrl}/botzei/game-servers/${server.id}`).subscribe({
      next: () => { this.snackBar.open('Server deleted', 'Close', { duration: 2000 }); this.loadData(); },
      error: () => { this.snackBar.open('Failed to delete', 'Close', { duration: 3000 }); },
    });
  }
}
