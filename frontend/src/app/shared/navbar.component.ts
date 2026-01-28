import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../auth/auth.service';
import { NotificationPanelComponent } from './notification-panel.component';
import { HallOfFameService } from './hall-of-fame.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    NotificationPanelComponent
  ],
  template: `
    <mat-toolbar class="navbar">
      <div class="nav-brand">
        <mat-icon class="brand-icon">sports_esports</mat-icon>
        <a routerLink="/dashboard" class="brand-text">1v1Leaderboards</a>
      </div>

      <!-- Desktop Navigation -->
      <nav class="nav-links desktop-only">
        <a routerLink="/users" routerLinkActive="active">Users</a>
        <a routerLink="/leaderboards" routerLinkActive="active">Leaderboards</a>
        <a routerLink="/challenges" routerLinkActive="active">Challenges</a>
      </nav>

      <span class="spacer"></span>

      <div class="nav-actions">
        <a (click)="goToHallOfFame()" class="hall-of-fame-link desktop-only" title="Hall of Fame">
          <mat-icon>emoji_events</mat-icon>
        </a>
        @if (authService.currentUser(); as user) {
          <app-notification-panel></app-notification-panel>
          <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-trigger desktop-only">
            @if (user.avatar) {
              <img [src]="user.avatar" [alt]="user.username" class="user-avatar" />
            } @else {
              <mat-icon class="user-icon">account_circle</mat-icon>
            }
            <span class="username">{{ user.username || user.email || 'Account' }}</span>
            <mat-icon>arrow_drop_down</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item routerLink="/users/{{user.id}}">
              <mat-icon>person</mat-icon>
              <span>Profile</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        } @else {
          <button class="sign-in-btn desktop-only" (click)="signIn()">
            <svg class="discord-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Sign In
          </button>
        }

        <!-- Hamburger Menu Button -->
        <button
          class="hamburger mobile-only"
          [class.active]="mobileMenuOpen()"
          (click)="toggleMobileMenu()"
          aria-label="Toggle menu">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>
    </mat-toolbar>

    <!-- Mobile Menu Overlay -->
    <div
      class="mobile-overlay"
      [class.open]="mobileMenuOpen()"
      (click)="closeMobileMenu()">
    </div>

    <!-- Mobile Menu -->
    <nav class="mobile-menu" [class.open]="mobileMenuOpen()">
      @if (authService.currentUser(); as user) {
        <div class="mobile-user-section">
          <div class="mobile-user-info">
            <mat-icon>account_circle</mat-icon>
            <span>{{ user.username || user.email || 'Account' }}</span>
          </div>
          <div class="mobile-user-actions">
            <a routerLink="/users/{{user.id}}" (click)="closeMobileMenu()">
              <mat-icon>person</mat-icon>
              Profile
            </a>
            <a (click)="logout(); closeMobileMenu()">
              <mat-icon>logout</mat-icon>
              Logout
            </a>
          </div>
        </div>
      } @else {
        <div class="mobile-guest-header">
          <button class="mobile-sign-in-btn" (click)="signIn()">
            <svg class="discord-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Sign In
          </button>
        </div>
      }

      <div class="mobile-nav-links">
        <a routerLink="/users" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon>people</mat-icon>
          Users
        </a>
        <a routerLink="/leaderboards" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon>leaderboard</mat-icon>
          Leaderboards
        </a>
        <a routerLink="/challenges" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon>sports_kabaddi</mat-icon>
          Challenges
        </a>
        <a (click)="goToHallOfFame()" class="hall-of-fame-mobile">
          <mat-icon>emoji_events</mat-icon>
          Hall of Fame
        </a>
      </div>

          </nav>
  `,
  styles: [`
    .navbar {
      background: #1a1a1a;
      border-bottom: 1px solid #2d2d2d;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 1000;
      max-width: 100vw;
      overflow-x: hidden;
      touch-action: manipulation;
      overscroll-behavior: contain;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 8px;

      .brand-icon {
        color: var(--theme-primary-bright, #64b5f6);
        font-size: 28px;
        width: 28px;
        height: 28px;
        transition: color 0.3s ease;
      }

      .brand-text {
        font-size: 18px;
        font-weight: 700;
        color: white;
        text-decoration: none;

        &:hover {
          opacity: 0.9;
        }
      }
    }

    .nav-links {
      display: flex;
      margin-left: 32px;
      gap: 4px;

      a {
        color: rgba(255, 255, 255, 0.7);
        font-weight: 500;
        font-size: 14px;
        text-decoration: none;
        padding: 8px 16px;
        border-radius: 8px;
        transition: all 0.2s ease;

        &:hover {
          color: white;
          background: rgba(255, 255, 255, 0.08);
        }

        &.active {
          color: var(--theme-primary-bright, #64b5f6);
          background: rgba(var(--theme-primary-rgb, 100, 181, 246), 0.15);
        }
      }
    }

    .spacer {
      flex: 1 1 auto;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hall-of-fame-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      color: #ffaa00;
      transition: all 0.2s ease;
      text-decoration: none;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      &:hover {
        background: rgba(255, 170, 0, 0.15);
        color: #ffcc00;
        transform: scale(1.1);
      }
    }

    .user-menu-trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.9);
      transition: all 0.2s ease;

      .user-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
      }

      .user-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: rgba(255, 255, 255, 0.7);
      }

      .username {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.08);
      }
    }

    /* Hamburger Menu Button */
    .hamburger {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 44px;
      height: 44px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      z-index: 1001;

      .hamburger-line {
        display: block;
        width: 24px;
        height: 2px;
        background: white;
        border-radius: 2px;
        transition: all 0.3s cubic-bezier(0.68, -0.6, 0.32, 1.6);
        position: relative;

        &:nth-child(1) {
          transform: translateY(-6px);
        }

        &:nth-child(2) {
          transform: scaleX(1);
        }

        &:nth-child(3) {
          transform: translateY(6px);
        }
      }

      &.active {
        .hamburger-line:nth-child(1) {
          transform: translateY(2px) rotate(45deg);
        }

        .hamburger-line:nth-child(2) {
          transform: scaleX(0);
          opacity: 0;
        }

        .hamburger-line:nth-child(3) {
          transform: translateY(-2px) rotate(-45deg);
        }
      }
    }

    /* Mobile Overlay */
    .mobile-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: 998;

      &.open {
        opacity: 1;
        visibility: visible;
      }
    }

    /* Mobile Menu */
    .mobile-menu {
      position: fixed;
      top: 0;
      right: 0;
      width: 280px;
      max-width: 85vw;
      height: 100vh;
      background: #1a1a1a;
      border-left: 1px solid #2d2d2d;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 999;
      display: flex;
      flex-direction: column;
      padding-top: 80px;

      &.open {
        transform: translateX(0);
      }
    }

    .mobile-user-section {
      border-bottom: 1px solid #2d2d2d;
    }

    .mobile-user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      color: white;
      font-weight: 600;
      font-size: 16px;

      mat-icon {
        color: var(--theme-primary-bright, #64b5f6);
        font-size: 32px;
        width: 32px;
        height: 32px;
        transition: color 0.3s ease;
      }
    }

    .mobile-user-actions {
      display: flex;
      border-top: 1px solid #2d2d2d;

      a {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        font-size: 13px;
        transition: all 0.2s ease;
        cursor: pointer;

        &:first-child {
          border-right: 1px solid #2d2d2d;
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }
      }
    }

    .mobile-guest-header {
      padding: 16px 24px;
      border-bottom: 1px solid #2d2d2d;
    }

    .mobile-sign-in-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 24px;
      background: #5865F2;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      .discord-icon {
        width: 20px;
        height: 20px;
      }

      &:hover {
        background: #4752c4;
      }
    }

    .sign-in-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #5865F2;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      .discord-icon {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: #4752c4;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .mobile-nav-links {
      flex: 1;
      padding: 16px 0;

      a {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px 24px;
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        font-size: 16px;
        font-weight: 500;
        transition: all 0.2s ease;

        mat-icon {
          color: rgba(255, 255, 255, 0.5);
          transition: color 0.2s ease;
        }

        &:hover, &.active {
          background: rgba(var(--theme-primary-rgb, 100, 181, 246), 0.15);
          color: var(--theme-primary-bright, #64b5f6);

          mat-icon {
            color: var(--theme-primary-bright, #64b5f6);
          }
        }

        &.hall-of-fame-mobile {
          color: #ffaa00;

          mat-icon {
            color: #ffaa00;
          }

          &:hover, &.active {
            background: rgba(255, 170, 0, 0.15);
            color: #ffcc00;

            mat-icon {
              color: #ffcc00;
            }
          }
        }
      }
    }

    /* Desktop only elements */
    .desktop-only {
      display: flex;
    }

    /* Mobile only elements */
    .mobile-only {
      display: none;
    }

    /* Mobile Breakpoint */
    @media (max-width: 768px) {
      .navbar {
        padding: 0 16px;
      }

      .desktop-only {
        display: none !important;
      }

      .mobile-only {
        display: flex !important;
      }

      .nav-brand .brand-text {
        font-size: 16px;
      }
    }

    /* Very small screens */
    @media (max-width: 360px) {
      .navbar {
        padding: 0 8px;
      }

      .nav-brand .brand-text {
        font-size: 14px;
      }

      .nav-brand .brand-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }
  `]
})
export class NavbarComponent {
  mobileMenuOpen = signal(false);

  constructor(
    public authService: AuthService,
    private router: Router,
    private hofService: HallOfFameService
  ) {}

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
    // Prevent body scroll when menu is open
    document.body.style.overflow = this.mobileMenuOpen() ? 'hidden' : '';
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
    document.body.style.overflow = '';
  }

  logout(): void {
    this.authService.logout();
  }

  signIn(): void {
    this.authService.initiateDiscordLogin();
  }

  goToHallOfFame(): void {
    this.closeMobileMenu();
    this.hofService.open();
  }
}
