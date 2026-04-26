import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { environment } from '../../environments/environment';

interface Channel {
  id: string;
  name: string;
}

interface GuildSettings {
  gameFeedChannelId?: string;
  tournamentChannelId?: string;
  matchThreadChannelId?: string;
}

@Component({
  selector: 'app-guild-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule, MatButtonModule],
  template: `
    <div class="page">
      <div class="container">
        <a routerLink="/admin/bot" class="back-link">&larr; Back to Bot Panel</a>

        @if (loading) {
          <p class="loading">Loading...</p>
        } @else {
          <h1>{{ guildName }}</h1>
          <p class="guild-id">{{ guildId }}</p>

          <section>
            <h2>Channel Assignments</h2>
            <p class="section-desc">Choose which channels receive automated messages from the bot.</p>

            <div class="setting-row">
              <div class="setting-info">
                <h3>Game Feed</h3>
                <p>Match results from game servers and the 1v1 queue</p>
              </div>
              <select
                [(ngModel)]="settings.gameFeedChannelId"
                (change)="save()"
                class="channel-select"
              >
                <option value="">None</option>
                @for (ch of channels; track ch.id) {
                  <option [value]="ch.id">#{{ ch.name }}</option>
                }
              </select>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h3>Tournament Updates</h3>
                <p>Tournament match results and announcements</p>
              </div>
              <select
                [(ngModel)]="settings.tournamentChannelId"
                (change)="save()"
                class="channel-select"
              >
                <option value="">None</option>
                @for (ch of channels; track ch.id) {
                  <option [value]="ch.id">#{{ ch.name }}</option>
                }
              </select>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <h3>Match Threads</h3>
                <p>Where 1v1 queue match threads are created</p>
              </div>
              <select
                [(ngModel)]="settings.matchThreadChannelId"
                (change)="save()"
                class="channel-select"
              >
                <option value="">None</option>
                @for (ch of channels; track ch.id) {
                  <option [value]="ch.id">#{{ ch.name }}</option>
                }
              </select>
            </div>
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .page {
      background: #0a0a0f;
      min-height: 100%;
    }

    .container {
      max-width: 700px;
      margin: 0 auto;
      padding: 48px 24px;
    }

    .back-link {
      color: rgba(255, 255, 255, 0.4);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: color 0.15s;

      &:hover { color: white; }
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      color: white;
      margin: 16px 0 4px;
    }

    .guild-id {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.2);
      font-family: monospace;
      margin: 0 0 32px;
    }

    .loading {
      color: rgba(255, 255, 255, 0.3);
      font-size: 14px;
    }

    section {
      margin-bottom: 32px;
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: white;
      margin: 0 0 4px;
    }

    .section-desc {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.35);
      margin: 0 0 20px;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 16px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);

      &:last-child {
        border-bottom: none;
      }
    }

    .setting-info {
      flex: 1;

      h3 {
        margin: 0 0 2px;
        font-size: 14px;
        font-weight: 600;
        color: white;
      }

      p {
        margin: 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.3);
      }
    }

    .channel-select {
      min-width: 200px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      flex-shrink: 0;

      &:focus {
        outline: none;
        border-color: rgba(37, 99, 235, 0.5);
      }

      option {
        background: #1a1a1a;
        color: white;
      }
    }

    @media (max-width: 600px) {
      .setting-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      .channel-select {
        min-width: 0;
        width: 100%;
      }
    }
  `],
})
export class GuildDetailComponent implements OnInit {
  guildId = '';
  guildName = '';
  channels: Channel[] = [];
  settings: GuildSettings = {};
  loading = true;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.guildId = this.route.snapshot.paramMap.get('guildId') || '';

    // Load guild info, channels, and settings in parallel
    Promise.all([
      this.http.get<any>(`${environment.apiUrl}/botzei/guilds`).toPromise(),
      this.http.get<Channel[]>(`${environment.apiUrl}/botzei/guilds/${this.guildId}/channels`).toPromise(),
      this.http.get<GuildSettings>(`${environment.apiUrl}/botzei/guilds/${this.guildId}/settings`).toPromise(),
    ]).then(([guildsData, channels, settings]) => {
      const guild = guildsData?.guilds?.find((g: any) => g.id === this.guildId);
      this.guildName = guild?.name || 'Unknown Server';
      this.channels = channels || [];
      this.settings = settings || {};
      this.loading = false;
    }).catch(() => {
      this.loading = false;
      this.snackBar.open('Failed to load guild data', 'Close', { duration: 3000 });
    });
  }

  save(): void {
    this.http
      .patch<GuildSettings>(
        `${environment.apiUrl}/botzei/guilds/${this.guildId}/settings`,
        this.settings,
      )
      .subscribe({
        next: (updated) => {
          this.settings = updated;
          this.snackBar.open('Settings saved', 'Close', { duration: 2000 });
        },
        error: () => {
          this.snackBar.open('Failed to save settings', 'Close', { duration: 3000 });
        },
      });
  }
}
