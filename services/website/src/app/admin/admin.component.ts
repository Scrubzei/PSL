import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface AdminTool {
  title: string;
  description: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page">
      <div class="container">
        <h1>Admin Tools</h1>
        <div class="tools-grid">
          @for (tool of tools; track tool.route) {
            <a [routerLink]="tool.route" class="tool-card">
              <i [class]="tool.icon" class="tool-icon"></i>
              <div class="tool-info">
                <h3>{{ tool.title }}</h3>
                <p>{{ tool.description }}</p>
              </div>
              <i class="fa-solid fa-chevron-right tool-arrow"></i>
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

    h1 {
      font-size: 28px;
      font-weight: 700;
      color: white;
      margin: 0 0 32px;
    }

    .tools-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }

    .tool-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.12);
        transform: translateY(-2px);
      }
    }

    .tool-icon {
      font-size: 24px;
      color: rgba(255, 255, 255, 0.4);
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      flex-shrink: 0;
    }

    .tool-info {
      flex: 1;
      min-width: 0;

      h3 {
        margin: 0 0 4px;
        font-size: 15px;
        font-weight: 600;
        color: white;
      }

      p {
        margin: 0;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.35);
      }
    }

    .tool-arrow {
      color: rgba(255, 255, 255, 0.15);
      font-size: 14px;
      flex-shrink: 0;
    }

    @media (max-width: 480px) {
      .tools-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AdminComponent {
  tools: AdminTool[] = [
    {
      title: 'Bot Panel',
      description: 'View bot status, servers, and controls',
      icon: 'fa-solid fa-robot',
      route: '/admin/bot',
    },
    {
      title: 'Queues',
      description: 'Create and manage 1v1 matchmaking queues',
      icon: 'fa-solid fa-users',
      route: '/admin/queues',
    },
    {
      title: 'Game Servers',
      description: 'Manage game servers for queues',
      icon: 'fa-solid fa-server',
      route: '/admin/servers',
    },
    {
      title: 'Bulk DM',
      description: 'Send Discord DMs to selected users',
      icon: 'fa-solid fa-paper-plane',
      route: '/admin/dm',
    },
  ];
}
