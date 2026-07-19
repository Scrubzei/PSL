import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TournamentsService, TournamentDetail, MyMatch } from './tournaments.service';
import { AuthService } from '../auth/auth.service';
import { ThemeService, Platform } from '../shared/theme.service';
import { ReportResultDialogComponent } from './report-result-dialog.component';
import { AuthModalComponent } from '../auth/auth-modal/auth-modal.component';
import { TournamentJoinModalComponent } from './tournament-join-modal.component';
import { UsersService } from '../users/users.service';
import { CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    CdkDrag,
    CdkDropList
  ],
  template: `
    <div class="tournament-detail-container">
      <!-- Ambient background -->
      <div class="ambient-bg">
        <div class="ambient-glow glow-1"></div>
        <div class="ambient-glow glow-2"></div>
        <div class="grid-overlay"></div>
        <div class="particles">
          @for (p of particles; track p.id) {
            <div class="particle"
              [style.left.%]="p.x"
              [style.top.%]="p.y"
              [style.animation-delay.s]="p.delay"
              [style.animation-duration.s]="p.duration"
              [class.particle-sm]="p.size === 0"
              [class.particle-md]="p.size === 1"
              [class.particle-lg]="p.size === 2">
            </div>
          }
        </div>
      </div>

      @if (loading) {
        <div class="loading-container">
          <div class="loader">
            <div class="loader-ring"></div>
            <mat-icon class="loader-icon">emoji_events</mat-icon>
          </div>
          <p>Loading tournament...</p>
        </div>
      } @else if (tournament) {
        <!-- Hero Banner -->
        <div class="hero-banner">
          <div class="hero-bg" [style.background-image]="'url(' + getGameImage() + ')'"></div>
          <div class="hero-overlay"></div>
          <div class="hero-glow"></div>
          <div class="hero-content">
            <div class="trophy-container">
              <div class="trophy-glow"></div>
              <mat-icon class="trophy-icon">emoji_events</mat-icon>
            </div>

            <div class="hero-text">
              <h1>{{ tournament.name }}</h1>
              <div class="hero-meta">
                <span class="meta-item">
                  <mat-icon>sports_esports</mat-icon>
                  {{ tournament.game.name.toUpperCase() }}
                </span>
                <span class="meta-divider"></span>
                <span class="meta-item">
                  <mat-icon>devices</mat-icon>
                  {{ tournament.platform.name }}
                </span>
                <span class="meta-divider"></span>
                <span class="meta-item">
                  <mat-icon>category</mat-icon>
                  {{ formatName(tournament.format) }}
                </span>
              </div>
            </div>
          </div>

          <div class="hero-actions">
            @if (tournament.status === 'REGISTRATION') {
              @if (!tournament.isSignedUp && !isTournamentFull()) {
                <div class="join-cta-inline">
                  <button class="join-btn" (click)="signup()" [disabled]="actionLoading">
                    @if (actionLoading) {
                      <mat-spinner diameter="24"></mat-spinner>
                    } @else {
                      <mat-icon>bolt</mat-icon>
                      <span>Join Tournament</span>
                    }
                  </button>
                  <span class="spots-text">{{ tournament.maxParticipants - (tournament.participantCount ?? 0) }} spots left</span>
                </div>
              } @else if (tournament.isSignedUp) {
                <button mat-raised-button class="action-btn withdraw-btn" (click)="withdraw()" [disabled]="actionLoading">
                  <mat-icon>exit_to_app</mat-icon>
                  Withdraw
                </button>
              }
            }
            @if (tournament.status === 'BRACKET_READY' || tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') {
              <button mat-raised-button class="action-btn bracket-btn" [routerLink]="['/tournaments', tournament.slug, 'bracket']">
                <mat-icon>account_tree</mat-icon>
                View Bracket
              </button>
            }
            @if (isAdmin && tournament.status === 'REGISTRATION' && seedsSaved && (isTournamentFull() || numByes > 0)) {
              <button class="start-btn" (click)="closeRegistration()" [disabled]="actionLoading">
                @if (actionLoading) {
                  <mat-spinner diameter="24"></mat-spinner>
                } @else {
                  <mat-icon>lock</mat-icon>
                  <span>Close Registration</span>
                }
              </button>
            }
            @if (isAdmin && tournament.status === 'BRACKET_READY') {
              <button class="start-btn" (click)="startTournament()" [disabled]="actionLoading">
                @if (actionLoading) {
                  <mat-spinner diameter="24"></mat-spinner>
                } @else {
                  <mat-icon>play_circle</mat-icon>
                  <span>Start Tournament</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Players Progress -->
        <div class="players-progress-bar">
          <div class="progress-header">
            <span class="progress-label">
              <mat-icon>group</mat-icon>
              Players
            </span>
            <span class="progress-count">{{ tournament.participantCount }}/{{ tournament.maxParticipants }}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" [style.width.%]="getParticipantProgress()"></div>
          </div>
        </div>

        <!-- Stats Bar -->
        @if ((tournament.registrationDeadline && tournament.status === 'REGISTRATION') || tournament.startDate) {
          <div class="stats-bar">
            @if (tournament.registrationDeadline && tournament.status === 'REGISTRATION') {
              <div class="stat-item">
                <div class="stat-icon time" [class.urgent]="isDeadlineUrgent">
                  <mat-icon>schedule</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-value countdown">{{ countdown }}</span>
                  <span class="stat-label">Registration Closes</span>
                </div>
              </div>
            }

            @if (tournament.startDate) {
              <div class="stat-item">
                <div class="stat-icon date">
                  <mat-icon>event</mat-icon>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ tournament.startDate | date:'MMM d, h:mm a' }}</span>
                  <span class="stat-label">Start Date</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- Sponsors -->
        @if (tournament.sponsors?.length) {
          <div class="sponsors-banner">
            <div class="sponsors-header">
              <mat-icon class="sponsors-icon">star</mat-icon>
              <span>Sponsored By</span>
            </div>
            <div class="sponsors-list">
              @for (sponsor of tournament.sponsors; track sponsor.name) {
                <div class="sponsor-chip">
                  @if (sponsor.url) {
                    <a [href]="sponsor.url" target="_blank" rel="noopener" class="sponsor-link">
                      <mat-icon>diamond</mat-icon>
                      {{ sponsor.name }}
                      <mat-icon class="ext">open_in_new</mat-icon>
                    </a>
                  } @else {
                    <span class="sponsor-name">
                      <mat-icon>diamond</mat-icon>
                      {{ sponsor.name }}
                    </span>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Main Content -->
        <div class="content-grid">
          <!-- Info Card -->
          <div class="glass-card info-card">
            <div class="card-header">
              <mat-icon>info</mat-icon>
              <h2>Tournament Details</h2>
            </div>
            <div class="card-content">
              @if (tournament.description) {
                <div class="description-block">
                  <p>{{ tournament.description }}</p>
                </div>
              }

              <div class="info-grid">
                <div class="info-item">
                  <mat-icon>person</mat-icon>
                  <div class="info-text">
                    <span class="info-label">Organized By</span>
                    <span class="info-value">{{ tournament.createdBy.username }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <mat-icon>format_list_numbered</mat-icon>
                  <div class="info-text">
                    <span class="info-label">Format</span>
                    <span class="info-value">{{ formatName(tournament.format) }}</span>
                  </div>
                </div>
                @if (tournament.registrationDeadline) {
                  <div class="info-item">
                    <mat-icon>event_busy</mat-icon>
                    <div class="info-text">
                      <span class="info-label">Deadline</span>
                      <span class="info-value">{{ tournament.registrationDeadline | date:'medium' }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Prize Pool Card -->
          @if (tournament.prizePool?.length) {
            <div class="glass-card prize-card">
              <div class="card-header">
                <mat-icon>emoji_events</mat-icon>
                <h2>Prize Pool</h2>
              </div>
              <div class="card-content">
                <div class="prize-list">
                  @for (entry of tournament.prizePool; track entry.place) {
                    <div class="prize-item" [class.first]="entry.place === 1" [class.second]="entry.place === 2" [class.third]="entry.place === 3">
                      <span class="prize-medal">{{ getPlaceMedal(entry.place) }}</span>
                      <span class="prize-label">{{ getPlaceLabel(entry.place) }}</span>
                      <span class="prize-value">{{ entry.prize }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Participants Card -->
          <div class="glass-card participants-card">
            <div class="card-header">
              <mat-icon>groups</mat-icon>
              <h2>{{ isAdmin && tournament.status === 'REGISTRATION' ? 'Seed Order' : 'Participants' }}</h2>
              <span class="participant-count">{{ tournament.participants.length }}</span>
            </div>
            <div class="card-content">
              @if (tournament.participants.length === 0) {
                <div class="empty-state">
                  <div class="empty-icon-container">
                    <mat-icon>person_add</mat-icon>
                  </div>
                  <h3>No Participants Yet</h3>
                  <p>Be the first to join this tournament!</p>
                </div>
              } @else if (isAdmin && tournament.status === 'REGISTRATION') {
                <!-- Admin drag-and-drop seeding -->
                <p class="seed-hint">Drag to reorder seeds. #1 seed plays the last seed.</p>
                @if (numByes > 0) {
                  <p class="bye-info">
                    <mat-icon>info_outline</mat-icon>
                    <strong>{{ numByes }} byes to assign</strong> ({{ byeUserIds.size }} of {{ numByes }} assigned)
                  </p>
                }
                <div class="participants-grid" cdkDropList (cdkDropListDropped)="onSeedDrop($event)">
                  @for (participant of seedsOrder; track participant.id; let i = $index) {
                    <div class="participant-card seed-draggable" cdkDrag [class.you]="isCurrentUser(participant.user.id)">
                      <mat-icon class="drag-handle" cdkDragHandle>drag_indicator</mat-icon>
                      <div class="participant-rank">#{{ i + 1 }}</div>
                      <div class="participant-avatar">
                        <span>{{ participant.user.username.charAt(0).toUpperCase() }}</span>
                      </div>
                      <div class="participant-info">
                        <span class="participant-name">
                          {{ participant.user.username }}
                          @if (isCurrentUser(participant.user.id)) {
                            <span class="you-badge">You</span>
                          }
                        </span>
                        <span class="participant-tags">
                          @if (participant.user.xboxGamertag) {
                            <span class="ptag xbox"><i class="fa-brands fa-xbox"></i> {{ participant.user.xboxGamertag }}</span>
                          }
                          @if (participant.user.discordUsername) {
                            <span class="ptag discord"><i class="fa-brands fa-discord"></i> {{ participant.user.discordUsername }}</span>
                          }
                          @if (isAdmin && participant.user.discordId) {
                            <span class="ptag acct-age" [title]="getDiscordCreatedDate(participant.user.discordId)">
                              <i class="fa-solid fa-clock"></i> {{ getDiscordAccountAge(participant.user.discordId) }}
                            </span>
                          }
                        </span>
                      </div>
                      @if (numByes > 0) {
                        <button class="bye-toggle"
                          [class.active]="byeUserIds.has(participant.user.id)"
                          [disabled]="!byeUserIds.has(participant.user.id) && byeUserIds.size >= numByes"
                          (click)="toggleBye(participant.user.id)">
                          BYE
                        </button>
                      }
                      <button class="kick-btn" (click)="kickParticipant(participant.user.id, participant.user.username); $event.stopPropagation()" title="Remove from tournament">
                        <mat-icon>person_remove</mat-icon>
                      </button>
                    </div>
                  }
                </div>
                <div class="seed-actions">
                  <button class="shuffle-seeds-btn" (click)="shuffleSeeds()">
                    <mat-icon>shuffle</mat-icon>
                    <span>Shuffle</span>
                  </button>
                  <button class="save-seeds-btn" (click)="saveSeeds()" [disabled]="seedsSaving || seedsSaved">
                    @if (seedsSaving) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else if (seedsSaved) {
                      <mat-icon>check</mat-icon>
                      <span>Seeds Saved</span>
                    } @else {
                      <mat-icon>save</mat-icon>
                      <span>Save Seeds</span>
                    }
                  </button>
                </div>
              } @else {
                <div class="participants-grid">
                  @for (participant of tournament.participants; track participant.id; let i = $index) {
                    <div class="participant-card" [class.eliminated]="participant.eliminated" [class.you]="isCurrentUser(participant.user.id)">
                      <div class="participant-rank">#{{ i + 1 }}</div>
                      <div class="participant-avatar">
                        <span>{{ participant.user.username.charAt(0).toUpperCase() }}</span>
                      </div>
                      <div class="participant-info">
                        <span class="participant-name">
                          {{ participant.user.username }}
                          @if (isCurrentUser(participant.user.id)) {
                            <span class="you-badge">You</span>
                          }
                        </span>
                        <span class="participant-tags">
                          @if (participant.user.xboxGamertag) {
                            <span class="ptag xbox"><i class="fa-brands fa-xbox"></i> {{ participant.user.xboxGamertag }}</span>
                          }
                          @if (participant.user.discordUsername) {
                            <span class="ptag discord"><i class="fa-brands fa-discord"></i> {{ participant.user.discordUsername }}</span>
                          }
                          @if (isAdmin && participant.user.discordId) {
                            <span class="ptag acct-age" [title]="getDiscordCreatedDate(participant.user.discordId)">
                              <i class="fa-solid fa-clock"></i> {{ getDiscordAccountAge(participant.user.discordId) }}
                            </span>
                          }
                        </span>
                      </div>
                      @if (participant.eliminated) {
                        <div class="eliminated-badge">
                          <mat-icon>close</mat-icon>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }

    .tournament-detail-container {
      max-width: 1100px;
      margin: 0 auto;
      min-height: 100dvh;
      padding: 0 16px 32px;
      position: relative;
      z-index: 1;
    }

    /* Ambient Background */
    .ambient-bg {
      position: fixed;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .ambient-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0;
      animation: glowDrift 12s ease-in-out infinite;
    }

    .glow-1 {
      width: 500px;
      height: 500px;
      background: var(--theme-primary);
      top: -10%;
      right: -5%;
      animation-delay: 0s;
    }

    .glow-2 {
      width: 400px;
      height: 400px;
      background: var(--theme-primary-dark);
      bottom: -5%;
      left: -5%;
      animation-delay: 6s;
    }

    @keyframes glowDrift {
      0%, 100% {
        opacity: 0.04;
        transform: translate(0, 0) scale(1);
      }
      50% {
        opacity: 0.08;
        transform: translate(30px, -20px) scale(1.1);
      }
    }

    .grid-overlay {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
      background-size: 80px 80px;
      mask-image: radial-gradient(ellipse at 50% 30%, black 0%, transparent 65%);
    }

    .particles {
      position: absolute;
      inset: 0;
    }

    .particle {
      position: absolute;
      border-radius: 50%;
      background: #f0c850;
      opacity: 0;
      animation: particleFloat linear infinite;
    }

    .particle-sm {
      width: 2px;
      height: 2px;
    }

    .particle-md {
      width: 3px;
      height: 3px;
    }

    .particle-lg {
      width: 4px;
      height: 4px;
      box-shadow: 0 0 8px rgba(240, 200, 80, 0.5);
    }

    @keyframes particleFloat {
      0% {
        opacity: 0;
        transform: translateY(0) translateX(0);
      }
      10% {
        opacity: 0.6;
      }
      50% {
        opacity: 0.3;
        transform: translateY(-60px) translateX(15px);
      }
      90% {
        opacity: 0.5;
      }
      100% {
        opacity: 0;
        transform: translateY(-120px) translateX(-10px);
      }
    }

    /* Loading State */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      color: rgba(255, 255, 255, 0.6);

      .loader {
        position: relative;
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .loader-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border: 3px solid transparent;
        border-top-color: var(--theme-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loader-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: var(--theme-primary);
        animation: pulse 1.5s ease-in-out infinite;
      }

      p {
        margin-top: 20px;
        font-size: 14px;
        letter-spacing: 0.5px;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(0.95); }
    }

    /* Hero Banner */
    .hero-banner {
      position: relative;
      padding: 48px 32px 36px;
      border-radius: 16px;
      overflow: hidden;
      margin-top: 16px;
      background: #0f0f0f;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.35;
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.5) 0%,
        rgba(0, 0, 0, 0.7) 60%,
        rgba(15, 15, 15, 0.95) 100%
      );
    }

    .hero-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 20%, rgba(var(--theme-primary-rgb), 0.15) 0%, transparent 55%);
      pointer-events: none;
    }

    .hero-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
      position: relative;
      z-index: 1;
    }

    .trophy-container {
      position: relative;
      flex-shrink: 0;
    }

    .trophy-glow {
      position: absolute;
      inset: -16px;
      background: radial-gradient(circle, rgba(240, 200, 80, 0.25) 0%, transparent 70%);
      animation: glow 3s ease-in-out infinite;
    }

    @keyframes glow {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.1); }
    }

    .trophy-icon {
      font-size: 44px;
      width: 44px;
      height: 44px;
      color: #f0c850;
      filter: drop-shadow(0 0 18px rgba(240, 200, 80, 0.35));
      position: relative;
    }

    .hero-text {
      width: 100%;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &.status-registration {
        background: rgba(16, 185, 129, 0.15);
        color: #10B981;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      &.status-bracket_ready {
        background: rgba(34, 211, 238, 0.15);
        color: #22D3EE;
        border: 1px solid rgba(34, 211, 238, 0.3);
      }

      &.status-in_progress {
        background: rgba(245, 158, 11, 0.15);
        color: #F59E0B;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }

      &.status-completed {
        background: rgba(148, 163, 184, 0.15);
        color: #94A3B8;
        border: 1px solid rgba(148, 163, 184, 0.3);
      }

      &.status-cancelled {
        background: rgba(220, 38, 38, 0.15);
        color: #EF4444;
        border: 1px solid rgba(220, 38, 38, 0.3);
      }
    }

    .hero-text h1 {
      margin: 0 0 10px;
      font-size: 2rem;
      font-weight: 700;
      color: white;
      letter-spacing: -0.02em;

      @media (max-width: 768px) {
        font-size: 1.5rem;
      }
    }

    .hero-meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(255, 255, 255, 0.55);
      font-size: 13px;
      font-weight: 500;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        opacity: 0.6;
      }
    }

    .meta-divider {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
    }

    .hero-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
      position: relative;
      z-index: 1;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 28px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 20px;
      }

      mat-spinner {
        margin-right: 4px;
      }

      &.withdraw-btn {
        background: rgba(var(--theme-primary-rgb), 0.12);
        color: var(--theme-primary-bright);
        border: 1px solid rgba(var(--theme-primary-rgb), 0.2);

        &:hover:not(:disabled) {
          background: rgba(var(--theme-primary-rgb), 0.2);
        }
      }

      &.bracket-btn {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);

        &:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.16);
        }
      }
    }

    .start-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-width: 200px;
      height: 48px;
      padding: 0 32px;
      background: var(--theme-primary);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &:hover:not(:disabled) {
        filter: brightness(1.15);
        box-shadow: 0 4px 20px rgba(var(--theme-primary-rgb), 0.35);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    /* Join CTA Inline */
    .join-cta-inline {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .spots-text {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
      font-weight: 500;
    }

    .join-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-width: 220px;
      height: 48px;
      padding: 0 32px;
      background: var(--theme-primary);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.12) 50%,
          transparent 70%
        );
        transform: translateX(-100%);
        animation: shimmer 3s ease-in-out infinite;
      }

      &:hover:not(:disabled) {
        filter: brightness(1.15);
        box-shadow: 0 4px 24px rgba(var(--theme-primary-rgb), 0.4);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    /* Players Progress Bar */
    .players-progress-bar {
      margin: 16px 0;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .progress-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.45);
      text-transform: uppercase;
      letter-spacing: 0.5px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: rgba(255, 255, 255, 0.3);
      }
    }

    .progress-count {
      font-size: 14px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.7);
    }

    .progress-track {
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--theme-primary);
      border-radius: 3px;
      transition: width 0.5s ease;
      min-width: 6px;
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      gap: 12px;
      margin: 0 0 16px;
      flex-wrap: wrap;

      @media (max-width: 768px) {
        flex-direction: column;
      }
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 150px;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.players {
        background: rgba(var(--theme-primary-rgb), 0.12);
        color: var(--theme-primary-bright);
      }

      &.time {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.6);

        &.urgent {
          background: rgba(var(--theme-primary-rgb), 0.12);
          color: var(--theme-primary-bright);
          animation: urgentPulse 1s ease-in-out infinite;
        }
      }

      &.date {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.5);
      }
    }

    @keyframes urgentPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
      color: white;

      &.countdown {
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.3px;
      }

      .stat-max {
        font-weight: 400;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .stat-label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 0.2px;
    }

    .stat-progress {
      flex: 1;
      max-width: 80px;

      mat-progress-bar {
        height: 5px;
        border-radius: 3px;

        ::ng-deep .mdc-linear-progress__buffer-bar {
          background-color: rgba(255, 255, 255, 0.1);
        }

        ::ng-deep .mdc-linear-progress__bar-inner {
          border-color: var(--theme-primary);
        }
      }
    }

    /* Sponsors Banner */
    .sponsors-banner {
      margin: 16px 0;
      padding: 20px 24px;
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.06) 0%, rgba(168, 85, 247, 0.02) 100%);
      border: 1px solid rgba(168, 85, 247, 0.15);
      border-radius: 14px;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at 20% 50%, rgba(168, 85, 247, 0.08) 0%, transparent 60%);
        pointer-events: none;
      }
    }

    .sponsors-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #A855F7;
      position: relative;
    }

    .sponsors-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      filter: drop-shadow(0 0 4px rgba(168, 85, 247, 0.5));
    }

    .sponsors-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      position: relative;
    }

    .sponsor-chip {
      display: flex;
    }

    .sponsor-link, .sponsor-name {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: rgba(168, 85, 247, 0.08);
      border: 1px solid rgba(168, 85, 247, 0.18);
      border-radius: 10px;
      color: #A855F7;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      letter-spacing: 0.2px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #A855F7;
        filter: drop-shadow(0 0 3px rgba(168, 85, 247, 0.4));
      }

      .ext {
        font-size: 13px;
        width: 13px;
        height: 13px;
        opacity: 0.5;
        filter: none;
      }
    }

    .sponsor-link:hover {
      background: rgba(168, 85, 247, 0.14);
      border-color: rgba(168, 85, 247, 0.3);
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.1);
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    /* Glass Cards */
    .glass-card {
      background: rgba(255, 255, 255, 0.025);
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);

      mat-icon {
        color: rgba(255, 255, 255, 0.4);
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      h2 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        flex: 1;
      }

      .participant-count {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.6);
        padding: 3px 10px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
      }
    }

    .card-content {
      padding: 16px;
    }

    /* Info Card */
    .description-block {
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      margin-bottom: 14px;
      border-left: 2px solid var(--theme-primary);

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.6;
        font-size: 13px;
      }
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.025);
      border-radius: 8px;
      transition: background 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      mat-icon {
        color: rgba(255, 255, 255, 0.35);
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .info-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .info-label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.35);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .info-value {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
    }

    /* Participants Card */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      text-align: center;
    }

    .empty-icon-container {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: rgba(255, 255, 255, 0.2);
      }
    }

    .empty-state h3 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
    }

    .empty-state p {
      margin: 0;
      color: rgba(255, 255, 255, 0.4);
      font-size: 13px;
    }

    .participants-grid {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 300px;
      overflow-y: auto;
      padding-right: 4px;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.12);
        border-radius: 2px;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }
    }

    /* Seed UI */
    .seed-hint {
      margin: 0 0 8px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
    }

    .bye-info {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 10px;
      padding: 8px 12px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: rgba(255, 255, 255, 0.35);
      }

      strong {
        color: rgba(255, 255, 255, 0.7);
      }
    }

    .bye-toggle {
      margin-left: auto;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: transparent;
      color: rgba(255, 255, 255, 0.35);
      flex-shrink: 0;

      &:hover:not(:disabled):not(.active) {
        border-color: rgba(var(--theme-primary-rgb), 0.4);
        color: rgba(255, 255, 255, 0.6);
      }

      &.active {
        background: var(--theme-primary);
        border-color: var(--theme-primary);
        color: white;
      }

      &:disabled {
        opacity: 0.25;
        cursor: not-allowed;
      }
    }

    .kick-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
      padding: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
      }
    }

    .seed-draggable {
      cursor: grab;
      transition: background 0.15s ease, box-shadow 0.15s ease;

      &:active {
        cursor: grabbing;
      }
    }

    .drag-handle {
      color: rgba(255, 255, 255, 0.3);
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 4px;
      cursor: grab;
    }

    .cdk-drag-preview {
      background: rgba(var(--theme-primary-rgb), 0.15);
      border: 1px solid rgba(var(--theme-primary-rgb), 0.4);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
    }

    .cdk-drag-animating {
      transition: transform 200ms ease;
    }

    .seed-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .shuffle-seeds-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.25);
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .save-seeds-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex: 1;
      padding: 10px 16px;
      background: var(--theme-primary);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        filter: brightness(1.15);
      }

      &:disabled {
        opacity: 0.6;
        cursor: default;
      }

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    /* Prize Pool */
    .prize-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .prize-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.02);

      &.first {
        background: rgba(255, 215, 0, 0.06);
        border: 1px solid rgba(255, 215, 0, 0.12);
      }

      &.second {
        background: rgba(192, 192, 192, 0.04);
        border: 1px solid rgba(192, 192, 192, 0.08);
      }

      &.third {
        background: rgba(205, 127, 50, 0.04);
        border: 1px solid rgba(205, 127, 50, 0.08);
      }
    }

    .prize-medal {
      font-size: 20px;
      line-height: 1;
    }

    .prize-label {
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      min-width: 70px;
    }

    .prize-value {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      margin-left: auto;
    }

    .participant-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      transition: background 0.15s ease;
      position: relative;

      &:hover {
        background: rgba(255, 255, 255, 0.04);
      }

      &.you {
        background: rgba(var(--theme-primary-rgb), 0.06);
        border: 1px solid rgba(var(--theme-primary-rgb), 0.12);
      }

      &.eliminated {
        opacity: 0.4;

        .participant-avatar {
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.3);
        }
      }
    }

    .participant-rank {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.3);
      min-width: 24px;
    }

    .participant-avatar {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      flex-shrink: 0;
    }

    .participant-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .participant-name {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
    }

    .participant-tags {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .ptag {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.35);
      display: flex;
      align-items: center;
      gap: 4px;

      i { font-size: 11px; }

      &.xbox i { color: #107C10; }
      &.discord i { color: #5865F2; }
      &.acct-age i { color: rgba(255, 255, 255, 0.25); }
    }

    .you-badge {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(var(--theme-primary-rgb), 0.15);
      color: var(--theme-primary-bright);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .eliminated-badge {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: rgba(var(--theme-primary-rgb), 0.12);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon {
        font-size: 13px;
        width: 13px;
        height: 13px;
        color: var(--theme-primary-bright);
      }
    }

    @media (max-width: 768px) {
      .tournament-detail-container {
        padding: 0 12px 24px;
      }

      .hero-banner {
        padding: 36px 16px 28px;
      }

      .content-grid {
        gap: 12px;
      }

      .join-btn {
        min-width: 180px;
        height: 44px;
        font-size: 14px;
      }

      .trophy-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
      }
    }

    /* My Match Section */
    .my-match-section {
      margin: 16px 0;
    }

    .my-match-card {
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid rgba(var(--theme-primary-rgb), 0.15);
      border-radius: 14px;
      padding: 20px;

      &.ready {
        border-color: rgba(var(--theme-primary-rgb), 0.3);
        box-shadow: 0 0 24px rgba(var(--theme-primary-rgb), 0.08);
      }

      &.loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 32px;
        color: rgba(255, 255, 255, 0.5);
      }

      &.eliminated {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px;
        border-color: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.4);

        mat-icon {
          font-size: 24px;
          color: rgba(255, 255, 255, 0.3);
        }
      }
    }

    .my-match-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .my-match-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--theme-primary-bright);
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      background: rgba(var(--theme-primary-rgb), 0.1);
      border: 1px solid rgba(var(--theme-primary-rgb), 0.2);
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      color: var(--theme-primary-bright);
      text-transform: uppercase;
      letter-spacing: 0.5px;

      .live-dot {
        width: 5px;
        height: 5px;
        background: var(--theme-primary-bright);
        border-radius: 50%;
        animation: blink 1s ease-in-out infinite;
      }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .my-match-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .matchup {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
    }

    .matchup .player {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      min-width: 100px;
    }

    .matchup .player-avatar {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 2px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.5);

      &.tbd {
        background: rgba(255, 255, 255, 0.02);
        border-color: rgba(255, 255, 255, 0.04);

        mat-icon {
          font-size: 22px;
          color: rgba(255, 255, 255, 0.2);
        }
      }
    }

    .matchup .player.you .player-avatar {
      border-color: rgba(var(--theme-primary-rgb), 0.4);
      box-shadow: 0 0 12px rgba(var(--theme-primary-rgb), 0.15);
    }

    .matchup .player-name {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);

      &.tbd {
        color: rgba(255, 255, 255, 0.25);
        font-style: italic;
      }
    }

    .you-tag {
      font-size: 9px;
      padding: 2px 7px;
      background: rgba(var(--theme-primary-rgb), 0.12);
      color: var(--theme-primary-bright);
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .vs {
      font-size: 16px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.2);
      padding: 0 8px;
    }

    .maps-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .map-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;

      mat-icon {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.4);
      }

      .map-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.4);
      }

      .map-name {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
      }
    }

    .report-result-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 24px;
      background: var(--theme-primary);
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 18px;
      }

      &:hover {
        filter: brightness(1.15);
        box-shadow: 0 4px 16px rgba(var(--theme-primary-rgb), 0.3);
      }
    }
  `]
})
export class TournamentDetailComponent implements OnInit, OnDestroy {
  tournament: TournamentDetail | null = null;
  loading = true;
  actionLoading = false;
  countdown = '';
  isDeadlineUrgent = false;
  myMatch: MyMatch | null = null;
  myMatchLoading = false;
  seedsOrder: TournamentDetail['participants'] = [];
  seedsSaved = false;
  seedsSaving = false;
  byeUserIds = new Set<string>();
  private countdownInterval?: ReturnType<typeof setInterval>;

  particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 6 + Math.random() * 8,
    size: Math.floor(Math.random() * 3),
  }));

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentsService: TournamentsService,
    public authService: AuthService,
    private snackBar: MatSnackBar,
    private themeService: ThemeService,
    private dialog: MatDialog,
    private usersService: UsersService,
  ) {}

  getGameImage(): string {
    if (!this.tournament) return '';
    const gameName = this.tournament.game.name.toLowerCase();
    return `/assets/games/${encodeURIComponent(gameName)}.webp`;
  }

  private setThemeFromPlatform(): void {
    if (!this.tournament) return;
    const platformMap: Record<string, Platform> = {
      'plutonium': 'Plutonium',
      'xbox': 'Xbox',
      'ps3': 'PlayStation'
    };
    const platformName = this.tournament.platform.name.toLowerCase();
    const themePlatform = platformMap[platformName];
    if (themePlatform) {
      this.themeService.setPlatform(themePlatform);
    }
  }

  get isAdmin(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  getDiscordCreatedDate(discordId: string): string {
    const snowflake = BigInt(discordId);
    const timestamp = Number(snowflake >> 22n) + 1420070400000;
    return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getDiscordAccountAge(discordId: string): string {
    const snowflake = BigInt(discordId);
    const timestamp = Number(snowflake >> 22n) + 1420070400000;
    const created = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const days = Math.floor(diffMs / 86400000);
    if (days < 30) return `${days}d old`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo old`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years}y ${remMonths}mo old` : `${years}y old`;
  }

  get numByes(): number {
    if (!this.tournament) return 0;
    const n = this.tournament.participants.length;
    if (n <= 1) return 0;
    return this.nextPowerOfTwo(n) - n;
  }

  private nextPowerOfTwo(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTournament(id);
    }
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    const updateCountdown = () => {
      if (!this.tournament?.registrationDeadline) {
        this.countdown = '';
        return;
      }

      const deadline = new Date(this.tournament.registrationDeadline).getTime();
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        this.countdown = 'Closed';
        this.isDeadlineUrgent = false;
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        this.countdown = `${days}d ${hours % 24}h`;
      } else if (hours > 0) {
        this.countdown = `${hours}h ${minutes}m`;
      } else {
        this.countdown = `${minutes}m ${seconds}s`;
      }

      this.isDeadlineUrgent = diff < 1000 * 60 * 60; // Less than 1 hour
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
  }

  isCurrentUser(userId: string): boolean {
    return this.authService.currentUser()?.id === userId;
  }

  getParticipantProgress(): number {
    const t = this.tournament;
    if (!t || !t.maxParticipants) return 0;
    return ((t.participantCount ?? 0) / t.maxParticipants) * 100;
  }

  isTournamentFull(): boolean {
    const t = this.tournament;
    if (!t) return false;
    return (t.participantCount ?? 0) >= t.maxParticipants;
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'REGISTRATION': return 'how_to_reg';
      case 'BRACKET_READY': return 'account_tree';
      case 'IN_PROGRESS': return 'play_circle';
      case 'COMPLETED': return 'emoji_events';
      case 'CANCELLED': return 'cancel';
      default: return 'info';
    }
  }

  loadTournament(id: string): void {
    this.loading = true;
    this.tournamentsService.getOne(id).subscribe({
      next: (tournament) => {
        this.tournament = tournament;
        this.loading = false;
        this.setThemeFromPlatform();
        // Initialize seed order for admin seeding UI
        this.byeUserIds = new Set<string>();
        if (tournament.status === 'REGISTRATION' && tournament.participants.length > 0) {
          this.seedsOrder = [...tournament.participants];
          this.seedsSaved = tournament.participants.every(p => p.seed != null);
        }
        if (tournament.registrationDeadline && tournament.status === 'REGISTRATION') {
          this.startCountdown();
        }
        // Load "My Match" if tournament is in progress and user is signed up
        if (tournament.status === 'IN_PROGRESS' && tournament.isSignedUp) {
          this.loadMyMatch(id);
        }
        // Auto-open join modal if returning from login
        if (localStorage.getItem('pending_tournament_join')) {
          localStorage.removeItem('pending_tournament_join');
          if (tournament.status === 'REGISTRATION' && !tournament.isSignedUp) {
            setTimeout(() => this.signup(), 300);
          }
        }
      },
      error: () => {
        this.snackBar.open('Failed to load tournament', 'Close', { duration: 3000 });
        this.loading = false;
        this.router.navigate(['/tournaments']);
      }
    });
  }

  loadMyMatch(id: string): void {
    if (!this.authService.currentUser()) return;

    this.myMatchLoading = true;
    this.tournamentsService.getMyMatch(id).subscribe({
      next: (response) => {
        this.myMatch = response.match;
        this.myMatchLoading = false;
      },
      error: () => {
        this.myMatch = null;
        this.myMatchLoading = false;
      }
    });
  }

  getOpponent(): { id: string; username: string } | null {
    if (!this.myMatch) return null;
    const currentUserId = this.authService.currentUser()?.id;
    if (this.myMatch.player1?.id === currentUserId) {
      return this.myMatch.player2;
    }
    return this.myMatch.player1;
  }

  openMyMatchReportDialog(): void {
    if (!this.myMatch) return;

    const dialogRef = this.dialog.open(ReportResultDialogComponent, {
      width: '400px',
      data: { match: this.myMatch }
    });

    dialogRef.afterClosed().subscribe(winnerId => {
      if (winnerId && this.tournament) {
        this.tournamentsService.reportResult(this.myMatch!.id, winnerId).subscribe({
          next: () => {
            this.snackBar.open('Result reported!', 'Close', { duration: 3000 });
            this.loadTournament(this.tournament!.id);
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to report result', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  signup(): void {
    if (!this.tournament) return;

    if (!this.authService.isAuthenticated()) {
      this.authService.storePendingAction({
        type: 'TOURNAMENT_SIGNUP',
        payload: { tournamentId: this.tournament.id },
        returnUrl: this.router.url
      });
      this.dialog.open(AuthModalComponent, {
        width: '400px',
        data: { message: 'Sign in to join this tournament' }
      });
      return;
    }

    // Open the join modal with rules, discord link, and plutonium username
    const dialogRef = this.dialog.open(TournamentJoinModalComponent, {
      width: '580px',
      panelClass: ['dark-dialog', 'tournament-join-panel'],
      autoFocus: false,
      data: {
        tournamentName: this.tournament.name,
        gameName: this.tournament.game?.name || '',
        platformName: this.tournament.platform?.name || '',
        plutoniumUsername: this.authService.currentUser()?.plutoniumUsername || null,
        xboxGamertag: this.authService.currentUser()?.xboxGamertag || null,
        startDate: this.tournament.startDate,
        roundDeadlines: this.tournament.roundDeadlines || null,
        prizePool: this.tournament.prizePool || null,
        howItWorks: this.tournament.howItWorks || null,
        disqualifications: this.tournament.disqualifications || null,
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result?.confirmed || !this.tournament) return;

      this.actionLoading = true;

      // Save platform username if it changed
      const profileUpdate: { plutoniumUsername?: string; xboxGamertag?: string } = {};
      const user = this.authService.currentUser();

      if (result.xboxGamertag !== undefined) {
        const currentGamertag = user?.xboxGamertag || '';
        if (result.xboxGamertag !== currentGamertag) {
          profileUpdate.xboxGamertag = result.xboxGamertag;
        }
      }
      if (result.plutoniumUsername !== undefined) {
        const currentPluto = user?.plutoniumUsername || '';
        if (result.plutoniumUsername !== currentPluto) {
          profileUpdate.plutoniumUsername = result.plutoniumUsername;
        }
      }

      if (Object.keys(profileUpdate).length > 0) {
        this.usersService.updateProfile(profileUpdate).subscribe({
          next: () => {
            if (user) {
              this.authService.currentUser.set({ ...user, ...profileUpdate });
            }
            this.doTournamentSignup();
          },
          error: () => {
            this.snackBar.open('Failed to save profile', 'Close', { duration: 3000 });
            this.actionLoading = false;
          }
        });
      } else {
        this.doTournamentSignup();
      }
    });
  }

  private doTournamentSignup(): void {
    if (!this.tournament) return;
    this.tournamentsService.signup(this.tournament.id).subscribe({
      next: () => {
        this.snackBar.open('Successfully joined the tournament!', 'Close', { duration: 3000 });
        this.loadTournament(this.tournament!.id);
        this.actionLoading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to join tournament', 'Close', { duration: 3000 });
        this.actionLoading = false;
      }
    });
  }

  withdraw(): void {
    if (!this.tournament) return;
    this.actionLoading = true;
    this.tournamentsService.withdraw(this.tournament.id).subscribe({
      next: () => {
        this.snackBar.open('Successfully withdrawn', 'Close', { duration: 3000 });
        this.loadTournament(this.tournament!.id);
        this.actionLoading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to withdraw', 'Close', { duration: 3000 });
        this.actionLoading = false;
      }
    });
  }

  kickParticipant(userId: string, username: string): void {
    if (!this.tournament) return;
    if (!confirm(`Remove ${username} from the tournament?`)) return;
    this.tournamentsService.kickParticipant(this.tournament.id, userId).subscribe({
      next: () => {
        this.snackBar.open(`${username} removed from tournament`, 'Close', { duration: 3000 });
        this.loadTournament(this.tournament!.id);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to remove participant', 'Close', { duration: 4000 });
      }
    });
  }

  toggleBye(userId: string): void {
    if (this.byeUserIds.has(userId)) {
      this.byeUserIds.delete(userId);
    } else if (this.byeUserIds.size < this.numByes) {
      this.byeUserIds.add(userId);
    }
    this.seedsSaved = false;
  }

  onSeedDrop(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.seedsOrder, event.previousIndex, event.currentIndex);
    this.seedsSaved = false;
  }

  shuffleSeeds(): void {
    for (let i = this.seedsOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.seedsOrder[i], this.seedsOrder[j]] = [this.seedsOrder[j], this.seedsOrder[i]];
    }
    this.seedsSaved = false;
  }

  saveSeeds(): void {
    if (!this.tournament) return;
    this.seedsSaving = true;
    const participantIds = this.seedsOrder.map(p => p.user.id);
    this.tournamentsService.updateSeeds(this.tournament.id, participantIds).subscribe({
      next: () => {
        this.seedsSaved = true;
        this.seedsSaving = false;
        this.snackBar.open('Seeds saved', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.seedsSaving = false;
        this.snackBar.open(err.error?.message || 'Failed to save seeds', 'Close', { duration: 3000 });
      }
    });
  }

  closeRegistration(): void {
    if (!this.tournament) return;
    this.actionLoading = true;
    const byeIds = this.byeUserIds.size > 0 ? Array.from(this.byeUserIds) : undefined;
    this.tournamentsService.closeRegistration(this.tournament.id, byeIds).subscribe({
      next: () => {
        this.snackBar.open('Registration closed — bracket posted!', 'Close', { duration: 3000 });
        this.loadTournament(this.tournament!.id);
        this.actionLoading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to close registration', 'Close', { duration: 3000 });
        this.actionLoading = false;
      }
    });
  }

  startTournament(): void {
    if (!this.tournament) return;
    this.actionLoading = true;
    this.tournamentsService.startTournament(this.tournament.id).subscribe({
      next: () => {
        this.snackBar.open('Tournament started!', 'Close', { duration: 3000 });
        this.loadTournament(this.tournament!.id);
        this.actionLoading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to start tournament', 'Close', { duration: 3000 });
        this.actionLoading = false;
      }
    });
  }

  getPlaceMedal(place: number): string {
    if (place === 1) return '\u{1F947}';
    if (place === 2) return '\u{1F948}';
    if (place === 3) return '\u{1F949}';
    return '\u{1F3C6}';
  }

  getPlaceLabel(place: number): string {
    if (place === 1) return '1st Place';
    if (place === 2) return '2nd Place';
    if (place === 3) return '3rd Place';
    return `${place}th Place`;
  }

  formatName(format: string): string {
    return format.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'REGISTRATION': return 'Registration Open';
      case 'BRACKET_READY': return 'Bracket Posted';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }
}
