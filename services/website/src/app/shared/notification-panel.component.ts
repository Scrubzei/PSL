import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { NotificationsService, Notification } from '../notifications/notifications.service';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="notificationMenu"
      #menuTrigger="matMenuTrigger"
      class="notification-button"
      [class.has-unread]="notificationsService.unreadCount() > 0"
      (click)="onBellClick()">
      <mat-icon>notifications</mat-icon>
      @if (notificationsService.unreadCount() > 0) {
        <span class="unread-dot"></span>
      }
    </button>

    <mat-menu #notificationMenu="matMenu" class="notification-menu">
      <div class="notification-header" (click)="$event.stopPropagation()">
        <button mat-icon-button class="close-btn mobile-only" (click)="closeMenu()">
          <mat-icon>close</mat-icon>
        </button>
        <span>Notifications</span>
      </div>
      <mat-divider></mat-divider>

      @if (notificationsService.notifications().length === 0) {
        <div class="no-notifications" (click)="$event.stopPropagation()">
          <mat-icon>notifications_none</mat-icon>
          <p>No notifications</p>
        </div>
      } @else {
        @for (notification of notificationsService.notifications().slice(0, 10); track notification.id) {
          <button
            mat-menu-item
            class="notification-item"
            [class.unread]="!notification.isRead"
            (click)="onNotificationClick(notification)">
            <div class="notification-content">
              <div class="notification-icon">
                <mat-icon [class]="getIconClass(notification.type)">{{ getIcon(notification.type) }}</mat-icon>
              </div>
              <div class="notification-text">
                <span class="title">{{ notification.title }}</span>
                <span class="message">{{ notification.message }}</span>
                <span class="time">{{ getTimeAgo(notification.createdAt) }}</span>
              </div>
            </div>
          </button>
        }
        @if (notificationsService.notifications().length > 10) {
          <mat-divider></mat-divider>
          <button mat-menu-item routerLink="/challenges" class="view-all">
            View all notifications
          </button>
        }
      }
    </mat-menu>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
    }

    .notification-button {
      position: relative;
      margin-right: 8px;
      color: rgba(255, 255, 255, 0.7);

      &:hover {
        color: rgba(255, 255, 255, 0.9);
      }

      &.has-unread {
        color: #f44336;
        animation: bellPulse 2s ease-in-out infinite;

        mat-icon {
          animation: bellShake 0.5s ease-in-out;
        }
      }

      .unread-dot {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 10px;
        height: 10px;
        background: #f44336;
        border-radius: 50%;
        border: 2px solid #1a1a1a;
        animation: dotPulse 2s ease-in-out infinite;
      }
    }

    @keyframes bellPulse {
      0%, 100% { color: #f44336; }
      50% { color: #ff6659; }
    }

    @keyframes dotPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }

    @keyframes bellShake {
      0%, 100% { transform: rotate(0); }
      20% { transform: rotate(15deg); }
      40% { transform: rotate(-15deg); }
      60% { transform: rotate(10deg); }
      80% { transform: rotate(-10deg); }
    }

    ::ng-deep .notification-menu {
      min-width: 350px !important;
      max-width: 400px !important;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      font-weight: 500;
      font-size: 14px;
      color: white;

      .close-btn {
        display: none;
      }
    }

    .mobile-only {
      display: none;
    }

    .no-notifications {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
      color: rgba(255, 255, 255, 0.5);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
        opacity: 0.5;
      }

      p {
        margin: 0;
      }
    }

    .notification-item {
      height: auto !important;
      padding: 12px 16px !important;
      white-space: normal !important;
      line-height: 1.4 !important;
    }

    .notification-item.unread {
      background-color: rgba(100, 181, 246, 0.08);
    }

    .notification-content {
      display: flex;
      gap: 12px;
      width: 100%;
    }

    .notification-icon {
      flex-shrink: 0;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      mat-icon.challenge-received {
        color: var(--theme-primary-bright, #64b5f6);
      }

      mat-icon.challenge-accepted {
        color: #81c784;
      }

      mat-icon.challenge-declined {
        color: #e57373;
      }

      mat-icon.challenge-cancelled {
        color: #9e9e9e;
      }
    }

    .notification-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      .title {
        font-weight: 500;
        font-size: 14px;
        color: white;
      }

      .message {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .time {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .view-all {
      text-align: center;
      color: var(--theme-primary-bright, #64b5f6);
    }

    /* Mobile fullscreen notification panel */
    @media (max-width: 768px) {
      ::ng-deep .notification-menu {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        min-width: 100vw !important;
        height: 100dvh !important;
        max-height: 100dvh !important;
        border-radius: 0 !important;
        margin: 0 !important;
      }

      ::ng-deep .notification-menu .mat-mdc-menu-content {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .notification-header {
        padding: 16px 20px;
        font-size: 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        .close-btn {
          display: flex !important;
          margin-right: 12px;
        }
      }

      .mobile-only {
        display: flex !important;
      }

      .no-notifications {
        flex: 1;
        justify-content: center;
      }

      .notification-item {
        padding: 16px 20px !important;
      }
    }
  `]
})
export class NotificationPanelComponent implements OnInit {
  @ViewChild('menuTrigger') menuTrigger!: MatMenuTrigger;

  constructor(
    public notificationsService: NotificationsService,
    private router: Router
  ) {}

  closeMenu(): void {
    this.menuTrigger.closeMenu();
  }

  ngOnInit(): void {
    this.notificationsService.startPolling();
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationsService.markNotificationAsRead(notification.id);
    }

    if (notification.relatedEntityType === 'MATCH' && notification.relatedEntityId) {
      this.router.navigate(['/challenges'], {
        queryParams: { highlight: notification.relatedEntityId }
      });
    }
  }

  onBellClick(): void {
    if (this.notificationsService.unreadCount() > 0) {
      this.notificationsService.markAllNotificationsAsRead();
    }
  }

  getIcon(type: string): string {
    switch (type) {
      case 'CHALLENGE_RECEIVED':
        return 'sports_esports';
      case 'CHALLENGE_ACCEPTED':
        return 'check_circle';
      case 'CHALLENGE_DECLINED':
        return 'cancel';
      case 'CHALLENGE_CANCELLED':
        return 'block';
      default:
        return 'notifications';
    }
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'CHALLENGE_RECEIVED':
        return 'challenge-received';
      case 'CHALLENGE_ACCEPTED':
        return 'challenge-accepted';
      case 'CHALLENGE_DECLINED':
        return 'challenge-declined';
      case 'CHALLENGE_CANCELLED':
        return 'challenge-cancelled';
      default:
        return '';
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }
}
