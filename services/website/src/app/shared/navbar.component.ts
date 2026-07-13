import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../auth/auth.service';
import { DevLoginModalComponent } from '../auth/dev-login-modal.component';
import { NotificationPanelComponent } from './notification-panel.component';
import { HallOfFameService } from './hall-of-fame.service';
import { environment } from '../../environments/environment';

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
        <a routerLink="/" class="brand-link">
          <img src="/assets/psl-logo.png" alt="Premier Sniping League" class="brand-logo" />
        </a>
      </div>

      <!-- Desktop Navigation -->
      <nav class="nav-links desktop-only">
        <a routerLink="/teams" routerLinkActive="active">Teams</a>
        <a routerLink="/tournaments" routerLinkActive="active">Tournaments</a>
        <!-- <a routerLink="/challenges" routerLinkActive="active">My Matches</a> -->
        <!-- <a routerLink="/disputes" routerLinkActive="active">Disputes</a> -->
        <!-- <a routerLink="/admin" routerLinkActive="active">Admin</a> -->
        <a routerLink="/rules" routerLinkActive="active">Rules</a>
      </nav>

      <span class="spacer"></span>

      <div class="nav-actions">
        @if (authService.currentUser(); as user) {
          <app-notification-panel></app-notification-panel>
          <button mat-button [matMenuTriggerFor]="userMenu" class="user-menu-trigger desktop-only">
            <mat-icon class="user-icon">account_circle</mat-icon>
            <span class="username">{{ user.username || 'Account' }}</span>
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
            <span>{{ user.username || 'Account' }}</span>
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
        <a routerLink="/teams" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon>groups</mat-icon>
          Teams
        </a>
        <a routerLink="/tournaments" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon>emoji_events</mat-icon>
          Tournaments
        </a>
        <a routerLink="/rules" routerLinkActive="active" (click)="closeMobileMenu()">
          <mat-icon>gavel</mat-icon>
          Rules
        </a>
      </div>

          </nav>
  `,
  styles: [`
    .navbar {
      background: #0d0d0d;
      border-bottom: none;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 1000;
      max-width: 100vw;
      overflow-x: hidden;
      touch-action: manipulation;
      overscroll-behavior: contain;
      height: 80px;
      box-shadow: 0 1px 0 rgba(124, 58, 237, 0.15);
    }

    .nav-brand {
      display: flex;
      align-items: center;

      .brand-link {
        display: flex;
        align-items: center;
        gap: 8px;
        text-decoration: none;

        &:hover {
          opacity: 0.9;
        }
      }

      .brand-logo {
        height: 64px;
        width: auto;
        object-fit: contain;
        margin-left: -4px;
      }

      .brand-text {
        font-size: 18px;
        font-weight: 700;
        color: white;
      }
    }

    .nav-links {
      display: flex;
      margin-left: 40px;
      gap: 2px;
      height: 100%;
      align-items: stretch;

      a {
        color: rgba(255, 255, 255, 0.5);
        font-weight: 600;
        font-size: 13px;
        text-decoration: none;
        padding: 0 18px;
        display: flex;
        align-items: center;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        position: relative;
        transition: color 0.2s ease;

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #7C3AED, #DC2626);
          transition: width 0.2s ease;
        }

        &:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        &.active {
          color: #fff;

          &::after {
            width: 100%;
          }
        }
      }
    }

    .spacer {
      flex: 1 1 auto;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .external-link {
      color: #ff4444;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      letter-spacing: 0.5px;
      margin-right: 16px;
      transition: color 0.2s ease;

      &:hover {
        color: #ff6b6b;
      }
    }

    .user-menu-trigger {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(255, 255, 255, 0.8);
      transition: all 0.2s ease;
      border-radius: 6px;

      ::ng-deep .mdc-button__label {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .user-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: rgba(255, 255, 255, 0.6);
      }

      .username {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 600;
      }

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.06);
      }
    }

    /* Hamburger Menu Button */
    .hamburger {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 40px;
      height: 40px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      z-index: 1001;

      .hamburger-line {
        display: block;
        width: 20px;
        height: 2px;
        background: white;
        border-radius: 1px;
        transition: all 0.3s cubic-bezier(0.68, -0.6, 0.32, 1.6);
        position: relative;

        &:nth-child(1) {
          transform: translateY(-5px);
        }

        &:nth-child(2) {
          transform: scaleX(1);
        }

        &:nth-child(3) {
          transform: translateY(5px);
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
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
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
      height: 100dvh;
      background: #0d0d0d;
      border-left: 1px solid #1a1a1a;
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
      border-bottom: 1px solid #1a1a1a;
    }

    .mobile-user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      color: white;
      font-weight: 600;
      font-size: 15px;

      mat-icon {
        color: #A855F7;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .mobile-user-actions {
      display: flex;
      border-top: 1px solid #1a1a1a;

      a {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        color: rgba(255, 255, 255, 0.6);
        text-decoration: none;
        font-size: 13px;
        transition: all 0.2s ease;
        cursor: pointer;

        &:first-child {
          border-right: 1px solid #1a1a1a;
        }

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &:hover {
          color: white;
          background: rgba(255, 255, 255, 0.04);
        }
      }
    }

    .mobile-guest-header {
      padding: 16px 24px;
      border-bottom: 1px solid #1a1a1a;
    }

    .mobile-sign-in-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #7C3AED, #6D28D9);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      .discord-icon {
        width: 20px;
        height: 20px;
      }

      &:hover {
        background: linear-gradient(135deg, #8B5CF6, #7C3AED);
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      }
    }

    .dev-login-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      background: rgba(255, 152, 0, 0.12);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 6px;
      color: #ff9800;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: rgba(255, 152, 0, 0.2);
        border-color: #ff9800;
      }
    }

    .sign-in-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 14px;
      background: linear-gradient(135deg, #7C3AED, #6D28D9);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      .discord-icon {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: linear-gradient(135deg, #8B5CF6, #7C3AED);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .mobile-nav-links {
      flex: 1;
      padding: 12px 0;

      a {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 24px;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        font-size: 15px;
        font-weight: 500;
        transition: all 0.2s ease;

        mat-icon {
          color: rgba(255, 255, 255, 0.4);
          font-size: 20px;
          width: 20px;
          height: 20px;
          transition: color 0.2s ease;
        }

        &:hover, &.active {
          background: rgba(124, 58, 237, 0.1);
          color: #A855F7;

          mat-icon {
            color: #7C3AED;
          }
        }

        &.external-link-mobile {
          color: #ff4444;

          mat-icon {
            color: #ff4444;
          }

          &:hover {
            background: rgba(255, 68, 68, 0.1);
            color: #ff6b6b;

            mat-icon {
              color: #ff6b6b;
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
  isProduction = environment.production;

  get isStaff(): boolean {
    const r = this.authService.currentUser()?.role;
    return r === 'ref' || r === 'admin' || r === 'owner';
  }

  get isAdmin(): boolean {
    const r = this.authService.currentUser()?.role;
    return r === 'admin' || r === 'owner';
  }

  constructor(
    public authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
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

  openDevLogin(): void {
    this.dialogRef?.close();
    const ref = this.dialog.open(DevLoginModalComponent, {
      width: '360px',
      panelClass: 'dev-login-dialog',
    });
    this.dialogRef = ref;
    ref.afterClosed().subscribe((user) => {
      this.dialogRef = null;
      if (user) {
        window.location.reload();
      }
    });
  }

  private dialogRef: any = null;

  goToHallOfFame(): void {
    this.closeMobileMenu();
    this.hofService.open();
  }
}
