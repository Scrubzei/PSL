import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TournamentsService, TournamentMatch, BracketResponse } from './tournaments.service';
import { AuthService } from '../auth/auth.service';
import { ThemeService, Platform } from '../shared/theme.service';
import { ReportResultDialogComponent } from './report-result-dialog.component';
import { MapPickerDialogComponent } from './map-picker-dialog.component';
import { ScheduleTimeDialogComponent } from './schedule-time-dialog.component';
import { SwapPlayerDialogComponent } from './swap-player-dialog.component';
import { PlayerDetailsDialogComponent } from './player-details-dialog.component';

interface RoundData {
  roundNumber: number;
  roundName: string;
  matches: TournamentMatch[];
}

@Component({
  selector: 'app-tournament-bracket',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  template: `
    <div class="bracket-page">
      @if (loading) {
        <div class="loading-container">
          <div class="loader">
            <div class="loader-ring"></div>
            <mat-icon class="loader-icon">account_tree</mat-icon>
          </div>
          <p>Loading bracket...</p>
        </div>
      } @else if (bracketData) {
        <!-- Hero Header -->
        <div class="hero-header">
          <div class="hero-bg" [style.background-image]="'url(' + getGameImage() + ')'"></div>
          <div class="hero-overlay"></div>
          <div class="hero-glow"></div>

          <div class="hero-content">
            <button mat-icon-button class="back-btn" [routerLink]="['/tournaments', bracketData.tournament.slug]" matTooltip="Back to tournament">
              <mat-icon>arrow_back</mat-icon>
            </button>

            <div class="tournament-info">
              <div class="tournament-badge">
                <mat-icon>emoji_events</mat-icon>
                <span>Tournament Bracket</span>
              </div>
              <h1>{{ bracketData.tournament.name }}</h1>
              <div class="meta-row">
                <span class="meta-item">
                  <mat-icon>sports_esports</mat-icon>
                  {{ bracketData.tournament.game.name.toUpperCase() }}
                </span>
                <span class="meta-divider"></span>
                <span class="meta-item">
                  <mat-icon>devices</mat-icon>
                  {{ bracketData.tournament.platform.name }}
                </span>
                <span class="meta-divider"></span>
                <span class="meta-item status" [class]="'status-' + bracketData.tournament.status.toLowerCase()">
                  <mat-icon>{{ getStatusIcon() }}</mat-icon>
                  {{ getStatusLabel() }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Champion Banner (if completed) -->
        @if (bracketData.tournament.status === 'COMPLETED' && getChampion()) {
          <div class="champion-section">
            <div class="champion-glow"></div>
            <div class="champion-content">
              <div class="crown-container">
                <mat-icon class="crown">workspace_premium</mat-icon>
              </div>
              <div class="champion-text">
                <span class="champion-label">Tournament Champion</span>
                <span class="champion-name">{{ getChampion()?.username }}</span>
              </div>
              <div class="trophy-container">
                <mat-icon class="trophy">emoji_events</mat-icon>
              </div>
            </div>
          </div>
        }

        <!-- Bracket Display -->
        <div class="bracket-section">
          <div class="bracket-scroll">
            <div class="bracket">
              @for (round of rounds; track round.roundNumber; let roundIndex = $index; let isLast = $last) {
                <div class="round" [class.finals]="round.roundNumber === 1"
                     [style.--round-progress]="rounds.length > 1 ? roundIndex / (rounds.length - 1) : 1">
                  <div class="round-header">
                    <span class="round-name">{{ round.roundName }}</span>
                    <span class="match-count">{{ round.matches.length }} {{ round.matches.length === 1 ? 'match' : 'matches' }}</span>
                  </div>

                  <div class="matches-column">
                    @for (match of round.matches; track match.id; let matchIndex = $index) {
                      <div class="match-wrapper">
                        <!-- Connector lines -->
                        @if (!isLast) {
                          <div class="connector">
                            <div class="connector-line horizontal"></div>
                            <div class="connector-line vertical" [class.top]="matchIndex % 2 === 0" [class.bottom]="matchIndex % 2 === 1"></div>
                          </div>
                        }

                        <div class="match-card"
                             [class.pending]="match.status === 'PENDING'"
                             [class.ready]="match.status === 'READY'"
                             [class.completed]="match.status === 'COMPLETED'"
                             [class.finals]="round.roundNumber === 1"
                             [class.bye]="match.isBye">

                          @if (match.isBye) {
                            <div class="bye-badge">
                              <span>BYE</span>
                            </div>
                          } @else if (match.status === 'READY' && bracketData.tournament.status === 'IN_PROGRESS') {
                            <div class="live-indicator">
                              <span class="live-dot"></span>
                              <span>LIVE</span>
                            </div>
                          }

                          <div class="match-number">Match {{ match.matchNumber }}</div>

                          @if (match.gameMaps?.length && !match.isBye) {
                            <div class="match-maps">
                              @for (map of match.gameMaps; track map.id; let mapIdx = $index) {
                                <div class="map-row">
                                  <mat-icon>map</mat-icon>
                                  <span class="map-num">{{ mapIdx + 1 }}.</span>
                                  <span>{{ map.mapName }}</span>
                                </div>
                              }
                              @if (canReportResult) {
                                <button class="edit-maps-btn" (click)="openMapPicker(match); $event.stopPropagation()">
                                  <mat-icon>edit</mat-icon>
                                </button>
                              }
                            </div>
                          } @else if (!match.isBye && canReportResult) {
                            <button class="edit-maps-btn standalone" (click)="openMapPicker(match); $event.stopPropagation()">
                              <mat-icon>add</mat-icon>
                              <span>Set Maps</span>
                            </button>
                          }

                          @if (match.scheduledTime && !match.isBye) {
                            <div class="match-scheduled-time">
                              <mat-icon>schedule</mat-icon>
                              <span>{{ formatScheduledTime(match.scheduledTime) }}</span>
                              @if (canReportResult) {
                                <button class="edit-time-btn" (click)="editScheduledTime(match); $event.stopPropagation()">
                                  <mat-icon>edit</mat-icon>
                                </button>
                              }
                            </div>
                          } @else if (!match.isBye && canReportResult) {
                            <button class="edit-time-btn standalone" (click)="editScheduledTime(match); $event.stopPropagation()">
                              <mat-icon>schedule</mat-icon>
                              <span>Set Time</span>
                            </button>
                          }

                          <div class="players">
                            <!-- Player 1 -->
                            <div class="player-slot"
                                 [class.winner]="match.status === 'COMPLETED' && !match.isBye && !!match.winner && !!match.player1 && match.winner.id === match.player1.id"
                                 [class.loser]="match.status === 'COMPLETED' && !match.isBye && match.player1 && match.winner && match.winner.id !== match.player1.id">
                              @if (match.player1) {
                                <div class="player-avatar">
                                  <span>{{ match.player1.username.charAt(0).toUpperCase() }}</span>
                                </div>
                                <div class="player-details">
                                  <span class="player-name clickable" (click)="openPlayerDetails(match.player1); $event.stopPropagation()">{{ match.player1.username }}</span>
                                  @if (match.player1.xboxGamertag || match.player1.discordUsername) {
                                    <span class="player-subtags">
                                      @if (match.player1.xboxGamertag) {
                                        <span class="ptag xbox"><i class="fa-brands fa-xbox"></i> {{ match.player1.xboxGamertag }}</span>
                                      }
                                      @if (match.player1.discordUsername) {
                                        <span class="ptag discord"><i class="fa-brands fa-discord"></i> {{ match.player1.discordUsername }}</span>
                                      }
                                    </span>
                                  }
                                </div>
                                @if (match.status === 'COMPLETED' && !match.isBye && match.winner && match.winner.id === match.player1.id) {
                                  <mat-icon class="winner-icon">emoji_events</mat-icon>
                                }
                                @if (isAdmin) {
                                  <button class="swap-btn" (click)="openSwapDialog(match.player1); $event.stopPropagation()" matTooltip="Swap player">
                                    <mat-icon>swap_horiz</mat-icon>
                                  </button>
                                }
                              } @else {
                                <div class="player-avatar tbd">
                                  <mat-icon>{{ match.isBye ? 'block' : 'help_outline' }}</mat-icon>
                                </div>
                                <span class="player-name" [class.tbd]="!match.isBye" [class.bye-text]="match.isBye">{{ match.isBye ? 'BYE' : 'TBD' }}</span>
                              }
                            </div>

                            <div class="vs-divider">
                              <span>VS</span>
                            </div>

                            <!-- Player 2 -->
                            <div class="player-slot"
                                 [class.winner]="match.status === 'COMPLETED' && !match.isBye && !!match.winner && !!match.player2 && match.winner.id === match.player2.id"
                                 [class.loser]="match.status === 'COMPLETED' && !match.isBye && match.player2 && match.winner && match.winner.id !== match.player2.id">
                              @if (match.player2) {
                                <div class="player-avatar">
                                  <span>{{ match.player2.username.charAt(0).toUpperCase() }}</span>
                                </div>
                                <div class="player-details">
                                  <span class="player-name clickable" (click)="openPlayerDetails(match.player2); $event.stopPropagation()">{{ match.player2.username }}</span>
                                  @if (match.player2.xboxGamertag || match.player2.discordUsername) {
                                    <span class="player-subtags">
                                      @if (match.player2.xboxGamertag) {
                                        <span class="ptag xbox"><i class="fa-brands fa-xbox"></i> {{ match.player2.xboxGamertag }}</span>
                                      }
                                      @if (match.player2.discordUsername) {
                                        <span class="ptag discord"><i class="fa-brands fa-discord"></i> {{ match.player2.discordUsername }}</span>
                                      }
                                    </span>
                                  }
                                </div>
                                @if (match.status === 'COMPLETED' && !match.isBye && match.winner && match.winner.id === match.player2.id) {
                                  <mat-icon class="winner-icon">emoji_events</mat-icon>
                                }
                                @if (isAdmin) {
                                  <button class="swap-btn" (click)="openSwapDialog(match.player2); $event.stopPropagation()" matTooltip="Swap player">
                                    <mat-icon>swap_horiz</mat-icon>
                                  </button>
                                }
                              } @else {
                                <div class="player-avatar tbd">
                                  <mat-icon>{{ match.isBye ? 'block' : 'help_outline' }}</mat-icon>
                                </div>
                                <span class="player-name" [class.tbd]="!match.isBye" [class.bye-text]="match.isBye">{{ match.isBye ? 'BYE' : 'TBD' }}</span>
                              }
                            </div>
                          </div>

                          @if (!match.isBye && (canReportResult || isUserInMatch(match)) && match.status === 'READY' && bracketData.tournament.status === 'IN_PROGRESS') {
                            <button class="report-btn" (click)="openReportDialog(match)">
                              <mat-icon>sports_score</mat-icon>
                              Report Winner
                            </button>
                          }
                          @if (!match.isBye && isAdmin && match.status === 'COMPLETED') {
                            <button class="revert-btn" (click)="revertMatch(match)">
                              <mat-icon>undo</mat-icon>
                              Revert
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Color Palette Variables - Uses theme variables from global styles */
    :host {
      /* Primary colors from platform theme */
      --color-primary: var(--theme-primary, #bf2120);
      --color-primary-bright: var(--theme-primary-bright, #ff4444);
      --color-primary-dark: var(--theme-primary-dark, #8B1615);
      --color-primary-rgb: var(--theme-primary-rgb, 191, 33, 32);

      /* Neutral palette - consistent across themes */
      --color-platinum: #E2E8F0;
      --color-silver: #94A3B8;
      --color-steel: #64748B;

      /* Status colors - consistent across themes */
      --color-cyan: #22D3EE;
      --color-cyan-dim: #06B6D4;
      --color-live: #22D3EE;
      --color-in-progress: #F59E0B;
      --color-completed: #10B981;
      --color-pending: #64748B;

      /* Surface colors */
      --surface-dark: #0f172a;
      --surface-card: #1e293b;
      --surface-elevated: #334155;
    }

    .bracket-page {
      min-height: 100dvh;
      background: #0a0a0b;
    }

    /* Loading */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      color: var(--color-silver);

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
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loader-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--color-primary);
      }

      p {
        margin-top: 20px;
        font-size: 14px;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Hero Header */
    .hero-header {
      position: relative;
      padding: 32px;
      overflow: hidden;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.3;
      filter: blur(2px);
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg,
        rgba(10, 10, 11, 0.7) 0%,
        rgba(10, 10, 11, 0.9) 70%,
        rgba(10, 10, 11, 1) 100%
      );
    }

    .hero-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% 0%, rgba(var(--color-primary-rgb), 0.15) 0%, transparent 60%);
    }

    .hero-content {
      position: relative;
      z-index: 1;
      max-width: 1200px;
      margin: 0 auto;
    }

    .back-btn {
      position: absolute;
      top: 0;
      left: 0;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--color-primary);
        transform: translateX(-2px);
      }
    }

    .tournament-info {
      text-align: center;
      padding-top: 20px;
    }

    .tournament-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(var(--color-primary-rgb), 0.1);
      border: 1px solid rgba(var(--color-primary-rgb), 0.3);
      border-radius: 20px;
      color: var(--color-primary-bright);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .tournament-info h1 {
      margin: 0 0 16px;
      font-size: 2.5rem;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
    }

    .meta-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-silver);
      font-size: 14px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        opacity: 0.7;
      }

      &.status {
        padding: 4px 12px;
        border-radius: 12px;
        font-weight: 500;

        &.status-bracket_ready {
          background: rgba(34, 211, 238, 0.15);
          color: var(--color-cyan);
          border: 1px solid rgba(34, 211, 238, 0.3);
        }

        &.status-in_progress {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-in-progress);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        &.status-completed {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-completed);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
      }
    }

    .meta-divider {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--color-steel);
    }

    /* Champion Section - Platinum + Red Glow */
    .champion-section {
      position: relative;
      margin: 0 24px 24px;
      padding: 32px;
      background: linear-gradient(145deg, var(--surface-card), var(--surface-dark));
      border: 2px solid rgba(226, 232, 240, 0.3);
      border-radius: 20px;
      overflow: hidden;
      box-shadow:
        0 0 60px rgba(var(--color-primary-rgb), 0.2),
        inset 0 1px 0 rgba(226, 232, 240, 0.1);
    }

    .champion-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 50%, rgba(var(--color-primary-rgb), 0.15) 0%, transparent 70%);
      animation: championPulse 3s ease-in-out infinite;
    }

    @keyframes championPulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .champion-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
    }

    .crown-container, .trophy-container {
      .crown, .trophy {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--color-platinum);
        filter: drop-shadow(0 0 20px rgba(var(--color-primary-rgb), 0.5));
        animation: float 3s ease-in-out infinite;
      }

      .trophy {
        animation-delay: 0.5s;
      }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .champion-text {
      text-align: center;
    }

    .champion-label {
      display: block;
      font-size: 12px;
      color: var(--color-silver);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 4px;
    }

    .champion-name {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: var(--color-platinum);
      text-shadow: 0 0 30px rgba(var(--color-primary-rgb), 0.5);
    }

    /* Bracket Section */
    .bracket-section {
      padding: 0 24px 48px;
    }

    .bracket-scroll {
      overflow-x: auto;
      padding: 24px 0;

      &::-webkit-scrollbar {
        height: 8px;
      }

      &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: var(--color-steel);
        border-radius: 4px;

        &:hover {
          background: var(--color-silver);
        }
      }
    }

    .bracket {
      display: flex;
      gap: 60px;
      min-width: fit-content;
      padding: 20px;
    }

    .round {
      display: flex;
      flex-direction: column;
      min-width: 280px;

      &.finals .round-header {
        box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.1);
      }
    }

    .round-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 20px;
      margin-bottom: 24px;
      background: linear-gradient(
        135deg,
        rgba(var(--color-primary-rgb), calc(0.03 + var(--round-progress) * 0.12)),
        rgba(var(--color-primary-rgb), calc(0.01 + var(--round-progress) * 0.04))
      );
      border: 1px solid rgba(var(--color-primary-rgb), calc(0.08 + var(--round-progress) * 0.32));
      border-radius: 12px;
      transition: all 0.3s ease;

      .round-name {
        font-size: 14px;
        font-weight: 700;
        color: color-mix(in srgb, var(--color-silver), var(--color-platinum) calc(var(--round-progress) * 100%));
        text-transform: uppercase;
        letter-spacing: 1.5px;
      }

      .match-count {
        font-size: 11px;
        color: var(--color-steel);
        margin-top: 2px;
      }
    }

    .matches-column {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      flex: 1;
      gap: 24px;
    }

    .match-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    /* Connector Lines */
    .connector {
      position: absolute;
      right: -60px;
      width: 60px;
      height: 100%;
      pointer-events: none;

      .connector-line {
        position: absolute;
        background: rgba(255, 255, 255, 0.08);

        &.horizontal {
          top: 50%;
          left: 0;
          width: 30px;
          height: 2px;
          transform: translateY(-50%);
        }

        &.vertical {
          left: 30px;
          width: 2px;
          height: 50%;

          &.top {
            top: 50%;
          }

          &.bottom {
            bottom: 50%;
          }
        }
      }
    }

    /* Match Card */
    .match-card {
      flex: 1;
      position: relative;
      background: linear-gradient(145deg, var(--surface-card), var(--surface-dark));
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 16px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        border-color: rgba(255, 255, 255, 0.1);
      }

      &.pending {
        opacity: 0.5;
      }

      &.ready {
        border-color: var(--color-cyan);
        box-shadow: 0 0 20px rgba(34, 211, 238, 0.15);
        animation: readyPulse 2s ease-in-out infinite;
      }

      &.completed {
        border-color: rgba(16, 185, 129, 0.3);
      }

      &.finals {
        background: linear-gradient(145deg, #1a1520, #12101a);
        border-color: rgba(var(--color-primary-rgb), 0.3);

        &.completed {
          border-color: rgba(226, 232, 240, 0.3);
          box-shadow: 0 0 40px rgba(var(--color-primary-rgb), 0.2);
        }
      }

      &.bye {
        opacity: 0.55;
        border-style: dashed;
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: none;

        &:hover {
          transform: none;
          box-shadow: none;
        }
      }
    }

    @keyframes readyPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.15); }
      50% { box-shadow: 0 0 30px rgba(34, 211, 238, 0.25); }
    }

    /* LIVE Indicator - Cyan */
    .live-indicator {
      position: absolute;
      top: -8px;
      right: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: linear-gradient(135deg, var(--color-cyan), var(--color-cyan-dim));
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 1px;

      .live-dot {
        width: 6px;
        height: 6px;
        background: #0f172a;
        border-radius: 50%;
        animation: liveBlink 1s ease-in-out infinite;
      }
    }

    @keyframes liveBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .bye-badge {
      position: absolute;
      top: -8px;
      right: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      background: var(--color-steel);
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .bye-text {
      color: var(--color-steel) !important;
      font-style: italic !important;
    }

    .match-number {
      font-size: 10px;
      color: var(--color-steel);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .match-maps {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 10px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      position: relative;

      .map-row {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: var(--color-silver);

        mat-icon {
          font-size: 12px;
          width: 12px;
          height: 12px;
          color: var(--color-primary);
        }

        .map-num {
          color: var(--color-steel);
          font-weight: 600;
          font-size: 10px;
          min-width: 14px;
        }
      }
    }

    .edit-maps-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: rgba(var(--color-primary-rgb), 0.15);
      border: 1px solid rgba(var(--color-primary-rgb), 0.25);
      border-radius: 4px;
      color: var(--color-primary-bright, var(--color-primary));
      cursor: pointer;
      font-size: 10px;
      transition: all 0.2s;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &:hover {
        background: rgba(var(--color-primary-rgb), 0.25);
      }

      &.standalone {
        position: relative;
        top: auto;
        right: auto;
        margin-bottom: 10px;
        padding: 4px 10px;
        width: fit-content;
      }
    }

    .match-scheduled-time {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 10px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      font-size: 11px;
      color: var(--color-silver);
      position: relative;

      > mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
        color: var(--color-primary);
      }
    }

    .edit-time-btn {
      position: absolute;
      top: 2px;
      right: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: rgba(var(--color-primary-rgb), 0.15);
      border: 1px solid rgba(var(--color-primary-rgb), 0.25);
      border-radius: 4px;
      color: var(--color-primary-bright, var(--color-primary));
      cursor: pointer;
      font-size: 10px;
      transition: all 0.2s;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &:hover {
        background: rgba(var(--color-primary-rgb), 0.25);
      }

      &.standalone {
        position: relative;
        top: auto;
        right: auto;
        margin-bottom: 10px;
        padding: 4px 10px;
        width: fit-content;
      }
    }

    .players {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .player-slot {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid transparent;
      border-radius: 10px;
      transition: all 0.3s ease;

      &.winner {
        background: rgba(226, 232, 240, 0.08);
        border-color: rgba(226, 232, 240, 0.2);

        .player-name {
          color: var(--color-platinum);
          font-weight: 600;
        }

        .player-avatar {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.4);
        }
      }

      &.loser {
        opacity: 0.35;

        .player-name {
          text-decoration: line-through;
          color: var(--color-steel);
        }
      }
    }

    .player-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--surface-elevated), var(--surface-card));
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: var(--color-silver);
      flex-shrink: 0;
      transition: all 0.3s ease;

      &.tbd {
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.05);

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: var(--color-steel);
        }
      }
    }

    .player-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .player-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);

      &.clickable {
        cursor: pointer;
        &:hover { text-decoration: underline; color: var(--color-primary); }
      }

      &.tbd {
        color: var(--color-steel);
        font-style: italic;
      }
    }

    .player-subtags {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .ptag {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      gap: 3px;

      i { font-size: 10px; }
      &.xbox i { color: #107C10; }
      &.discord i { color: #5865F2; }
    }

    /* Winner Trophy - Platinum */
    .winner-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--color-platinum);
      filter: drop-shadow(0 0 8px rgba(var(--color-primary-rgb), 0.5));
      animation: trophyBounce 0.6s ease-out;
    }

    @keyframes trophyBounce {
      0% { transform: scale(0); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }

    .vs-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px 0;

      span {
        font-size: 10px;
        font-weight: 700;
        color: var(--color-steel);
        letter-spacing: 2px;
      }
    }

    /* Report Button - Red */
    .swap-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      background: rgba(34, 211, 238, 0.1);
      border: 1px solid rgba(34, 211, 238, 0.2);
      border-radius: 4px;
      color: rgba(34, 211, 238, 0.6);
      cursor: pointer;
      transition: all 0.15s;
      margin-left: auto;
      flex-shrink: 0;

      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      &:hover {
        background: rgba(34, 211, 238, 0.2);
        color: #22d3ee;
        border-color: rgba(34, 211, 238, 0.4);
      }
    }

    .report-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      margin-top: 12px;
      padding: 10px 16px;
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(var(--color-primary-rgb), 0.4);
      }
    }

    .revert-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.25);
        color: #f87171;
      }
    }

    /* Mobile */
    @media (max-width: 768px) {
      .hero-header {
        padding: 24px 16px;
      }

      .tournament-info h1 {
        font-size: 1.5rem;
      }

      .champion-section {
        margin: 0 16px 16px;
        padding: 20px;
      }

      .champion-name {
        font-size: 1.5rem;
      }

      .crown-container, .trophy-container {
        .crown, .trophy {
          font-size: 32px;
          width: 32px;
          height: 32px;
        }
      }

      .bracket-section {
        padding: 0 16px 32px;
      }

      .bracket {
        gap: 40px;
      }

      .round {
        min-width: 240px;
      }
    }
  `]
})
export class TournamentBracketComponent implements OnInit, OnDestroy {
  bracketData: BracketResponse | null = null;
  rounds: RoundData[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentsService: TournamentsService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private themeService: ThemeService,
  ) {}

  get canReportResult(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'admin' || role === 'ref';
  }

  get isAdmin(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  openPlayerDetails(player: { id: string; username: string; xboxGamertag?: string | null; plutoniumUsername?: string | null; discordUsername?: string | null }): void {
    if (!this.bracketData) return;
    this.dialog.open(PlayerDetailsDialogComponent, {
      width: '380px',
      data: {
        player,
        platformName: this.bracketData.tournament.platform.name,
      }
    });
  }

  isUserInMatch(match: TournamentMatch): boolean {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return false;
    return match.player1?.id === userId || match.player2?.id === userId;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBracket(id);
    }
  }

  ngOnDestroy(): void {
    // Reset theme if needed
  }

  getGameImage(): string {
    if (!this.bracketData) return '';
    const gameName = this.bracketData.tournament.game.name.toLowerCase();
    return `/assets/games/${encodeURIComponent(gameName)}.webp`;
  }

  private setThemeFromPlatform(): void {
    if (!this.bracketData) return;
    const platformMap: Record<string, Platform> = {
      'plutonium': 'Plutonium',
      'xbox': 'Xbox',
      'ps3': 'PS3'
    };
    const platformName = this.bracketData.tournament.platform.name.toLowerCase();
    const themePlatform = platformMap[platformName];
    if (themePlatform) {
      this.themeService.setPlatform(themePlatform);
    }
  }

  getStatusIcon(): string {
    switch (this.bracketData?.tournament.status) {
      case 'BRACKET_READY': return 'account_tree';
      case 'IN_PROGRESS': return 'play_circle';
      case 'COMPLETED': return 'emoji_events';
      default: return 'info';
    }
  }

  getStatusLabel(): string {
    switch (this.bracketData?.tournament.status) {
      case 'BRACKET_READY': return 'Bracket Posted';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      default: return this.bracketData?.tournament.status || '';
    }
  }

  loadBracket(id: string): void {
    this.loading = true;
    this.tournamentsService.getBracket(id).subscribe({
      next: (data) => {
        this.bracketData = data;
        this.organizeBracket(data.matches);
        this.setThemeFromPlatform();
        this.loading = false;
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to load bracket', 'Close', { duration: 3000 });
        this.loading = false;
        this.router.navigate(['/tournaments']);
      }
    });
  }

  organizeBracket(matches: TournamentMatch[]): void {
    const roundMap = new Map<number, TournamentMatch[]>();

    for (const match of matches) {
      if (!roundMap.has(match.round)) {
        roundMap.set(match.round, []);
      }
      roundMap.get(match.round)!.push(match);
    }

    const sortedRounds = Array.from(roundMap.keys()).sort((a, b) => b - a);

    this.rounds = sortedRounds.map(roundNum => {
      const roundMatches = roundMap.get(roundNum)!;
      roundMatches.sort((a, b) => a.matchNumber - b.matchNumber);

      return {
        roundNumber: roundNum,
        roundName: this.getRoundName(roundNum, sortedRounds.length),
        matches: roundMatches
      };
    });
  }

  getRoundName(round: number, totalRounds: number): string {
    if (round === 1) return 'Grand Finals';
    if (round === 2) return 'Semi-Finals';
    if (round === 3) return 'Quarter-Finals';

    const roundFromStart = totalRounds - round + 1;
    return `Round ${roundFromStart}`;
  }

  getChampion(): { id: string; username: string } | null {
    if (!this.bracketData) return null;
    const finals = this.bracketData.matches.find(m => m.round === 1);
    return finals?.winner || null;
  }

  openMapPicker(match: TournamentMatch): void {
    if (!this.bracketData) return;
    const dialogRef = this.dialog.open(MapPickerDialogComponent, {
      width: '400px',
      data: {
        matchId: match.id,
        gameId: this.bracketData.tournament.game.id,
        gameName: this.bracketData.tournament.game.name,
        currentMaps: match.gameMaps || [],
      }
    });

    dialogRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.loadBracket(this.bracketData!.tournament.id);
      }
    });
  }

  formatScheduledTime(time: string): string {
    const d = new Date(time);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
    const clock = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
    return `${date}, ${clock} CT`;
  }

  editScheduledTime(match: TournamentMatch): void {
    const dialogRef = this.dialog.open(ScheduleTimeDialogComponent, {
      width: '400px',
      data: {
        matchId: match.id,
        currentTime: match.scheduledTime || null,
      }
    });

    dialogRef.afterClosed().subscribe(saved => {
      if (saved) {
        this.snackBar.open('Scheduled time updated', 'Close', { duration: 3000 });
        this.loadBracket(this.bracketData!.tournament.id);
      }
    });
  }

  openSwapDialog(player: { id: string; username: string }): void {
    if (!this.bracketData) return;

    const participantIds = new Set<string>();
    for (const match of this.bracketData.matches) {
      if (match.player1) participantIds.add(match.player1.id);
      if (match.player2) participantIds.add(match.player2.id);
    }

    const dialogRef = this.dialog.open(SwapPlayerDialogComponent, {
      width: '400px',
      data: {
        currentPlayer: player,
        tournamentId: this.bracketData.tournament.id,
        participantIds,
      }
    });

    dialogRef.afterClosed().subscribe((newUser) => {
      if (newUser && this.bracketData) {
        this.tournamentsService.swapPlayer(
          this.bracketData.tournament.id,
          player.id,
          newUser.id
        ).subscribe({
          next: () => {
            this.snackBar.open(`Swapped ${player.username} with ${newUser.username}`, 'Close', { duration: 3000 });
            this.loadBracket(this.bracketData!.tournament.id);
          },
          error: (err: any) => {
            this.snackBar.open(err.error?.message || 'Failed to swap player', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  revertMatch(match: TournamentMatch): void {
    const winner = match.winner?.username || 'winner';
    if (!confirm(`Revert this match result? (${winner} won)`)) return;

    this.tournamentsService.revertMatchResult(match.id).subscribe({
      next: () => {
        this.snackBar.open('Match result reverted', 'Close', { duration: 3000 });
        this.loadBracket(this.bracketData!.tournament.id);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to revert match', 'Close', { duration: 4000 });
      }
    });
  }

  openReportDialog(match: TournamentMatch): void {
    const dialogRef = this.dialog.open(ReportResultDialogComponent, {
      width: '400px',
      data: { match }
    });

    dialogRef.afterClosed().subscribe(winnerId => {
      if (winnerId) {
        this.tournamentsService.reportResult(match.id, winnerId).subscribe({
          next: () => {
            this.snackBar.open('Result reported!', 'Close', { duration: 3000 });
            this.loadBracket(this.bracketData!.tournament.id);
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to report result', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}
