import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  ownerId: string;
  joinedAt: string;
}

@Component({
  selector: 'app-bot-panel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="container">
        <div class="header">
          <h1>Bot Panel</h1>
          @if (botUser) {
            <div class="bot-status">
              <span class="status-dot"></span>
              <span>{{ botUser }}</span>
              <span class="uptime">Uptime: {{ formatUptime(uptime) }}</span>
            </div>
          }
        </div>

        <h2>Servers</h2>

        @if (loading) {
          <p class="loading">Loading...</p>
        }

        @if (!loading && guilds.length === 0) {
          <div class="empty">
            <p>Bot is not in any servers, or could not be reached.</p>
          </div>
        }

        <div class="guilds-grid">
          @for (guild of guilds; track guild.id) {
            <a class="guild-card" [routerLink]="['/admin/bot', guild.id]">
              <div class="guild-icon">
                @if (guild.icon) {
                  <img [src]="guild.icon" [alt]="guild.name" />
                } @else {
                  <span class="guild-initial">{{ guild.name.charAt(0) }}</span>
                }
              </div>
              <div class="guild-info">
                <h3>{{ guild.name }}</h3>
                <div class="guild-meta">
                  <span>{{ guild.memberCount }} members</span>
                  <span class="separator">·</span>
                  <span>Joined {{ formatDate(guild.joinedAt) }}</span>
                </div>
              </div>
              <span class="guild-id">{{ guild.id }}</span>
              <i class="fa-solid fa-chevron-right guild-arrow"></i>
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page {
      background: #0a0a0f;
      min-height: 100%;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 48px 24px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 32px;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    h2 {
      font-size: 16px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 16px;
    }

    .bot-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
      }

      .uptime {
        color: rgba(255, 255, 255, 0.3);
      }
    }

    .loading, .empty p {
      color: rgba(255, 255, 255, 0.3);
      font-size: 14px;
    }

    .guilds-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .guild-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      transition: all 0.15s;
      text-decoration: none;
      cursor: pointer;

      &:hover {
        border-color: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
      }
    }

    .guild-arrow {
      color: rgba(255, 255, 255, 0.15);
      font-size: 14px;
      flex-shrink: 0;
    }

    .guild-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .guild-initial {
        font-size: 18px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .guild-info {
      flex: 1;
      min-width: 0;

      h3 {
        margin: 0 0 4px;
        font-size: 15px;
        font-weight: 600;
        color: white;
      }
    }

    .guild-meta {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.35);
      display: flex;
      align-items: center;
      gap: 6px;

      .separator {
        color: rgba(255, 255, 255, 0.15);
      }
    }

    .guild-id {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.15);
      font-family: monospace;
      flex-shrink: 0;
    }

    @media (max-width: 600px) {
      .guild-id {
        display: none;
      }
    }
  `],
})
export class BotPanelComponent implements OnInit {
  guilds: Guild[] = [];
  botUser: string | null = null;
  uptime: number | null = null;
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/botzei/guilds`).subscribe({
      next: (data) => {
        this.guilds = data.guilds || [];
        this.botUser = data.botUser || null;
        this.uptime = data.uptime || null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  formatUptime(ms: number | null): string {
    if (!ms) return 'unknown';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  formatDate(iso: string): string {
    if (!iso) return 'unknown';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
