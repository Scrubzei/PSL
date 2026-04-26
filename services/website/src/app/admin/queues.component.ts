import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';
import { CreateQueueDialogComponent } from './create-queue-dialog.component';
import { EditQueueDialogComponent } from './edit-queue-dialog.component';

interface QueueInfo {
  id: string;
  guildId: string;
  channelId: string;
  queueType?: string;
  matchThreadChannelId?: string;
  leaderboardId: string;
  title: string;
  game: string;
  platform: string;
  maps: string[];
  playerCount: number;
  createdAt: number;
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
}

@Component({
  selector: 'app-queues',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule, MatButtonModule, MatDialogModule],
  template: `
    <div class="page">
      <div class="container">
        <div class="header">
          <div>
            <a routerLink="/admin" class="back-link">&larr; Admin</a>
            <h1>Queue Management</h1>
          </div>
          <button mat-flat-button color="primary" (click)="openCreateDialog()">
            <i class="fa-solid fa-plus"></i>
            Create Queue
          </button>
        </div>

        @if (loading) {
          <p class="loading">Loading queues...</p>
        }

        @if (!loading && queues.length === 0) {
          <div class="empty">
            <p>No active queues. Create one to get started.</p>
          </div>
        }

        <div class="queues-list">
          @for (queue of queues; track queue.id) {
            <div class="queue-card">
              <div class="queue-info">
                <h3>{{ queue.title }}</h3>
                <div class="queue-meta">
                  <span class="type-badge" [class.plutonium]="queue.queueType === 'plutonium'">
                    {{ queue.queueType === 'plutonium' ? 'Game Server' : 'Standard' }}
                  </span>
                  <span class="separator">·</span>
                  <span>{{ queue.game }} · {{ queue.platform }}</span>
                  <span class="separator">·</span>
                  <span>{{ queue.maps.join(', ') }}</span>
                </div>
                <div class="queue-meta">
                  <span>{{ queue.playerCount }} in queue</span>
                  <span class="separator">·</span>
                  <span>{{ getGuildName(queue.guildId) }}</span>
                </div>
              </div>
              <div class="queue-actions">
                <button
                  mat-stroked-button
                  (click)="editQueue(queue)"
                >
                  Edit
                </button>
                <button
                  mat-stroked-button
                  (click)="restoreQueue(queue)"
                  [disabled]="restoring === queue.id"
                >
                  {{ restoring === queue.id ? 'Restoring...' : 'Restore' }}
                </button>
                <button
                  mat-stroked-button
                  color="warn"
                  (click)="deleteQueue(queue)"
                >
                  Delete
                </button>
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

    .header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 32px;
      gap: 16px;

      h1 { font-size: 28px; font-weight: 700; color: white; margin: 8px 0 0; }
      button i { margin-right: 8px; }
    }

    .back-link {
      color: rgba(255, 255, 255, 0.4);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      &:hover { color: white; }
    }

    .loading, .empty p {
      color: rgba(255, 255, 255, 0.3);
      font-size: 14px;
    }

    .queues-list { display: flex; flex-direction: column; gap: 10px; }

    .queue-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .queue-info {
      flex: 1;
      min-width: 0;

      h3 { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: white; }
    }

    .queue-meta {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.35);
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;

      .separator { color: rgba(255, 255, 255, 0.15); }
    }

    .type-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(37, 99, 235, 0.15);
      color: #60a5fa;

      &.plutonium {
        background: rgba(191, 33, 32, 0.15);
        color: #f87171;
      }
    }

    .queue-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  `],
})
export class QueuesComponent implements OnInit {
  queues: QueueInfo[] = [];
  guilds: Guild[] = [];
  loading = true;
  restoring: string | null = null;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    Promise.all([
      this.http.get<QueueInfo[]>(`${environment.apiUrl}/botzei/queues`).toPromise(),
      this.http.get<any>(`${environment.apiUrl}/botzei/guilds`).toPromise(),
    ]).then(([queues, guildsData]) => {
      this.queues = queues || [];
      this.guilds = guildsData?.guilds || [];
      this.loading = false;
    }).catch(() => {
      this.loading = false;
      this.snackBar.open('Failed to load data', 'Close', { duration: 3000 });
    });
  }

  getGuildName(guildId: string): string {
    return this.guilds.find((g) => g.id === guildId)?.name || guildId;
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateQueueDialogComponent, {
      width: '520px',
      data: { guilds: this.guilds },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadData();
    });
  }

  editQueue(queue: QueueInfo): void {
    // Fetch channels and maps in parallel, then open dialog
    Promise.all([
      this.http.get<any[]>(`${environment.apiUrl}/botzei/guilds/${queue.guildId}/channels`).toPromise(),
      this.http.get<any[]>(`${environment.apiUrl}/games/${encodeURIComponent(queue.game)}/maps`).toPromise(),
    ]).then(([channels, maps]) => {
      const dialogRef = this.dialog.open(EditQueueDialogComponent, {
        width: '520px',
        data: {
          queue,
          channels: channels || [],
          allMaps: (maps || []).map((m: any) => m.mapName),
        },
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) this.loadData();
      });
    }).catch(() => {
      this.snackBar.open('Failed to load queue data for editing', 'Close', { duration: 3000 });
    });
  }

  deleteQueue(queue: QueueInfo): void {
    if (!confirm(`Delete queue "${queue.title}"?`)) return;
    this.http.delete(`${environment.apiUrl}/botzei/queues/${queue.id}`).subscribe({
      next: () => {
        this.snackBar.open('Queue deleted', 'Close', { duration: 2000 });
        this.loadData();
      },
      error: () => {
        this.snackBar.open('Failed to delete queue', 'Close', { duration: 3000 });
      },
    });
  }

  restoreQueue(queue: QueueInfo): void {
    this.restoring = queue.id;

    // Delete the old queue, then recreate with the same settings
    this.http.delete(`${environment.apiUrl}/botzei/queues/${queue.id}`).subscribe({
      next: () => {
        this.http.post<any>(`${environment.apiUrl}/botzei/queues`, {
          guildId: queue.guildId,
          channelId: queue.channelId,
          matchThreadChannelId: queue.matchThreadChannelId || undefined,
          leaderboardId: queue.leaderboardId,
          title: queue.title,
          game: queue.game,
          platform: queue.platform,
          maps: queue.maps,
        }).subscribe({
          next: (result) => {
            this.restoring = null;
            if (result?.error) {
              this.snackBar.open(result.error, 'Close', { duration: 4000 });
            } else {
              this.snackBar.open('Queue restored', 'Close', { duration: 2000 });
            }
            this.loadData();
          },
          error: () => {
            this.restoring = null;
            this.snackBar.open('Failed to recreate queue', 'Close', { duration: 3000 });
            this.loadData();
          },
        });
      },
      error: () => {
        this.restoring = null;
        this.snackBar.open('Failed to delete old queue', 'Close', { duration: 3000 });
      },
    });
  }
}
