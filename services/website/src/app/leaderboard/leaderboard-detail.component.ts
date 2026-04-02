import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../auth/auth.service';
import { AuthModalComponent } from '../auth/auth-modal/auth-modal.component';
import { LeaderboardsService, LeaderboardEntry, Leaderboard } from './leaderboards.service';
import { ThemeService, Platform } from '../shared/theme.service';
import { forkJoin } from 'rxjs';

interface DisplayEntry {
  id: string;
  rank: number;
  userId: string;
  username: string;
  emblem: string | null;
  score: number;
  wins: number;
  losses: number;
  placeholder?: boolean;
}

@Component({
  selector: 'app-leaderboard-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-wrapper">
      <!-- Background image -->
      <div class="bg-image" [style.background-image]="'url(' + gameImage + ')'"></div>
      <div class="bg-overlay"></div>
      <div class="bg-glow"></div>

      <!-- Background decorations -->
      <div class="bg-decoration">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="grid-lines"></div>
        <div class="noise-overlay"></div>
      </div>

      <div class="leaderboard-detail-container">
      <div class="header">
        <div class="title-row">
          <h1>{{ game }}</h1>
          <span class="platform-badge">{{ platform }}</span>
        </div>
        <span class="season-badge">Season 1 - Live</span>
      </div>

      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading leaderboard...</p>
        </div>
      } @else {
        <mat-card>
          <mat-tab-group (selectedTabChange)="onTabChange($event)">
            <mat-tab label="Ranked">
              @if (podiumPlayers.length === 3) {
                <div class="podium">
                  <div class="podium-spot podium-2">
                    <div class="podium-player">
                      @if (podiumPlayers[1].emblem) {
                        <img class="podium-emblem podium-emblem-2" [src]="'/assets/emblems/' + podiumPlayers[1].emblem" alt="emblem">
                      }
                      <div class="podium-rank-badge podium-rank-2">#2</div>
                      <div class="podium-name">{{ podiumPlayers[1].username }}</div>
                      <div class="podium-record"><span class="wins">{{ podiumPlayers[1].wins }}</span><span class="podium-sep">-</span><span class="losses">{{ podiumPlayers[1].losses }}</span></div>
                      <div class="podium-winpct">{{ getWinPct(podiumPlayers[1]) }}%</div>
                    </div>
                    <div class="podium-bar podium-bar-2"></div>
                  </div>
                  <div class="podium-spot podium-1">
                    <div class="podium-player">
                      @if (podiumPlayers[0].emblem) {
                        <img class="podium-emblem podium-emblem-1" [src]="'/assets/emblems/' + podiumPlayers[0].emblem" alt="emblem">
                      }
                      <div class="podium-rank-badge podium-rank-1">#1</div>
                      <div class="podium-name">{{ podiumPlayers[0].username }}</div>
                      <div class="podium-record"><span class="wins">{{ podiumPlayers[0].wins }}</span><span class="podium-sep">-</span><span class="losses">{{ podiumPlayers[0].losses }}</span></div>
                      <div class="podium-winpct">{{ getWinPct(podiumPlayers[0]) }}%</div>
                    </div>
                    <div class="podium-bar podium-bar-1"></div>
                  </div>
                  <div class="podium-spot podium-3">
                    <div class="podium-player">
                      @if (podiumPlayers[2].emblem) {
                        <img class="podium-emblem podium-emblem-3" [src]="'/assets/emblems/' + podiumPlayers[2].emblem" alt="emblem">
                      }
                      <div class="podium-rank-badge podium-rank-3">#3</div>
                      <div class="podium-name">{{ podiumPlayers[2].username }}</div>
                      <div class="podium-record"><span class="wins">{{ podiumPlayers[2].wins }}</span><span class="podium-sep">-</span><span class="losses">{{ podiumPlayers[2].losses }}</span></div>
                      <div class="podium-winpct">{{ getWinPct(podiumPlayers[2]) }}%</div>
                    </div>
                    <div class="podium-bar podium-bar-3"></div>
                  </div>
                </div>
              }
              <div class="table-container">
                @if (isAdmin) {
                  <div class="admin-controls">
                    @if (!editingRanks) {
                      <button mat-stroked-button (click)="startEditRanks()">
                        <mat-icon>edit</mat-icon> Edit Ranks
                      </button>
                    } @else {
                      <button mat-flat-button color="primary" (click)="saveRanks()" [disabled]="savingRanks">
                        {{ savingRanks ? 'Saving...' : 'Save Ranks' }}
                      </button>
                      <button mat-stroked-button (click)="cancelEditRanks()">Cancel</button>
                    }
                    <div class="add-player-form">
                      <input type="text" class="add-player-input" placeholder="Username" [(ngModel)]="addPlayerUsername">
                      <button mat-stroked-button (click)="addPlayer()" [disabled]="addingPlayer || !addPlayerUsername.trim()">
                        {{ addingPlayer ? 'Adding...' : 'Add Player' }}
                      </button>
                    </div>
                  </div>
                }
                <table mat-table [dataSource]="rankedData">
                    <ng-container matColumnDef="rank">
                      <th mat-header-cell *matHeaderCellDef>Rank</th>
                      <td mat-cell *matCellDef="let entry; let i = index" [class]="editingRanks ? '' : getRankClass(entry.rank)">
                        @if (editingRanks && !entry.placeholder) {
                          <input type="number" min="1" class="rank-input" [(ngModel)]="editedRanks[entry.userId]">
                        } @else if (entry.rank === 1 && !entry.placeholder) {
                          <span class="rank-1-badge">#1</span>
                        } @else if (entry.rank === 2 && !entry.placeholder) {
                          <span class="rank-2-badge">#2</span>
                        } @else if (entry.rank === 3 && !entry.placeholder) {
                          <span class="rank-3-badge">#3</span>
                        } @else {
                          {{ entry.rank }}
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="username">
                      <th mat-header-cell *matHeaderCellDef>Player</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder" [class.rank-1-name]="entry.rank === 1 && !entry.placeholder" [class.rank-2-name]="entry.rank === 2 && !entry.placeholder" [class.rank-3-name]="entry.rank === 3 && !entry.placeholder">
                        @if (entry.placeholder) {
                          Awaiting placement match
                        } @else {
                          <a [routerLink]="['/users', entry.userId]" class="lb-player-link">{{ entry.username }}</a>
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="record">
                      <th mat-header-cell *matHeaderCellDef>Record</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder">
                        @if (!entry.placeholder) {
                          <span class="record"><span class="wins">{{ entry.wins }}</span><span class="record-sep">-</span><span class="losses">{{ entry.losses }}</span></span>
                        } @else {
                          —
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="winpct">
                      <th mat-header-cell *matHeaderCellDef>Win %</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder">
                        @if (!entry.placeholder) {
                          <span class="winpct" [class.winpct-hot]="getWinPct(entry) >= 70" [class.winpct-good]="getWinPct(entry) >= 50 && getWinPct(entry) < 70" [class.winpct-cold]="getWinPct(entry) < 50 && (entry.wins + entry.losses) > 0" [class.winpct-none]="(entry.wins + entry.losses) === 0">{{ (entry.wins + entry.losses) === 0 ? '—' : (getWinPct(entry) + '%') }}</span>
                        } @else {
                          —
                        }
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="rankedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: rankedColumns;"
                        [class.placeholder-row]="row.placeholder"
                        [class.rank-1-row]="row.rank === 1 && !row.placeholder"
                        [class.rank-2-row]="row.rank === 2 && !row.placeholder"
                        [class.rank-3-row]="row.rank === 3 && !row.placeholder"></tr>
                  </table>
              </div>
            </mat-tab>

            <mat-tab label="XP (Elo)">
              @if (xpPodiumPlayers.length === 3) {
                <div class="podium">
                  <div class="podium-spot podium-2">
                    <div class="podium-player">
                      @if (xpPodiumPlayers[1].emblem) {
                        <img class="podium-emblem podium-emblem-2" [src]="'/assets/emblems/' + xpPodiumPlayers[1].emblem" alt="emblem">
                      }
                      <div class="podium-rank-badge podium-rank-2">#2</div>
                      <div class="podium-name">{{ xpPodiumPlayers[1].username }}</div>
                      <div class="podium-elo">{{ xpPodiumPlayers[1].score | number }}</div>
                      <div class="podium-record"><span class="wins">{{ xpPodiumPlayers[1].wins }}</span><span class="podium-sep">-</span><span class="losses">{{ xpPodiumPlayers[1].losses }}</span></div>
                    </div>
                    <div class="podium-bar podium-bar-2"></div>
                  </div>
                  <div class="podium-spot podium-1">
                    <div class="podium-player">
                      @if (xpPodiumPlayers[0].emblem) {
                        <img class="podium-emblem podium-emblem-1" [src]="'/assets/emblems/' + xpPodiumPlayers[0].emblem" alt="emblem">
                      }
                      <div class="podium-rank-badge podium-rank-1">#1</div>
                      <div class="podium-name">{{ xpPodiumPlayers[0].username }}</div>
                      <div class="podium-elo">{{ xpPodiumPlayers[0].score | number }}</div>
                      <div class="podium-record"><span class="wins">{{ xpPodiumPlayers[0].wins }}</span><span class="podium-sep">-</span><span class="losses">{{ xpPodiumPlayers[0].losses }}</span></div>
                    </div>
                    <div class="podium-bar podium-bar-1"></div>
                  </div>
                  <div class="podium-spot podium-3">
                    <div class="podium-player">
                      @if (xpPodiumPlayers[2].emblem) {
                        <img class="podium-emblem podium-emblem-3" [src]="'/assets/emblems/' + xpPodiumPlayers[2].emblem" alt="emblem">
                      }
                      <div class="podium-rank-badge podium-rank-3">#3</div>
                      <div class="podium-name">{{ xpPodiumPlayers[2].username }}</div>
                      <div class="podium-elo">{{ xpPodiumPlayers[2].score | number }}</div>
                      <div class="podium-record"><span class="wins">{{ xpPodiumPlayers[2].wins }}</span><span class="podium-sep">-</span><span class="losses">{{ xpPodiumPlayers[2].losses }}</span></div>
                    </div>
                    <div class="podium-bar podium-bar-3"></div>
                  </div>
                </div>
              }
              <div class="table-container xp-tab">
                @if (leaderboard) {
                <div class="xp-actions">
                  @if (!xpOptIn) {
                    <button mat-flat-button color="primary" (click)="xpJoin()">
                      <mat-icon>emoji_events</mat-icon>
                      Join XP ladder
                    </button>
                  }
                  @if (xpOptIn) {
                    <span class="xp-joined-badge"><mat-icon>check_circle</mat-icon> On XP ladder</span>
                  }
                </div>
                }
                <table mat-table [dataSource]="xpData">
                    <ng-container matColumnDef="rank">
                      <th mat-header-cell *matHeaderCellDef>Rank</th>
                      <td mat-cell *matCellDef="let entry" [class]="getRankClass(entry.rank)">
                        @if (entry.rank === 1 && !entry.placeholder) {
                          <span class="rank-1-badge">#1</span>
                        } @else if (entry.rank === 2 && !entry.placeholder) {
                          <span class="rank-2-badge">#2</span>
                        } @else if (entry.rank === 3 && !entry.placeholder) {
                          <span class="rank-3-badge">#3</span>
                        } @else {
                          {{ entry.rank }}
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="username">
                      <th mat-header-cell *matHeaderCellDef>Player</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder" [class.rank-1-name]="entry.rank === 1 && !entry.placeholder" [class.rank-2-name]="entry.rank === 2 && !entry.placeholder" [class.rank-3-name]="entry.rank === 3 && !entry.placeholder">
                        @if (entry.placeholder) {
                          Awaiting challenger
                        } @else {
                          <a [routerLink]="['/users', entry.userId]" class="lb-player-link">{{ entry.username }}</a>
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="score">
                      <th mat-header-cell *matHeaderCellDef>Elo</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder">
                        {{ entry.placeholder ? '—' : (entry.score | number) }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="record">
                      <th mat-header-cell *matHeaderCellDef>Record</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder">
                        @if (!entry.placeholder) {
                          <span class="record"><span class="wins">{{ entry.wins }}</span><span class="record-sep">-</span><span class="losses">{{ entry.losses }}</span></span>
                        } @else {
                          —
                        }
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="winpct">
                      <th mat-header-cell *matHeaderCellDef>Win %</th>
                      <td mat-cell *matCellDef="let entry" [class.placeholder-cell]="entry.placeholder">
                        @if (!entry.placeholder) {
                          <span class="winpct" [class.winpct-hot]="getWinPct(entry) >= 70" [class.winpct-good]="getWinPct(entry) >= 50 && getWinPct(entry) < 70" [class.winpct-cold]="getWinPct(entry) < 50 && (entry.wins + entry.losses) > 0" [class.winpct-none]="(entry.wins + entry.losses) === 0">{{ (entry.wins + entry.losses) === 0 ? '—' : (getWinPct(entry) + '%') }}</span>
                        } @else {
                          —
                        }
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="xpColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: xpColumns;"
                        [class.placeholder-row]="row.placeholder"
                        [class.rank-1-row]="row.rank === 1 && !row.placeholder"
                        [class.rank-2-row]="row.rank === 2 && !row.placeholder"
                        [class.rank-3-row]="row.rank === 3 && !row.placeholder"></tr>
                  </table>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card>
      }
    </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      position: relative;
      background: #121212;
      min-height: 100%;
    }

    .bg-image {
      position: fixed;
      inset: 0;
      top: 64px;
      background-size: cover;
      background-position: center;
      z-index: 0;
      pointer-events: none;
      opacity: 0.5;
      transition: opacity 0.3s ease;
    }

    .bg-overlay {
      position: fixed;
      inset: 0;
      top: 64px;
      background: linear-gradient(
        135deg,
        rgba(0, 0, 0, 0.9) 0%,
        rgba(0, 0, 0, 0.7) 50%,
        rgba(0, 0, 0, 0.85) 100%
      );
      z-index: 0;
      pointer-events: none;
    }

    .bg-glow {
      position: fixed;
      inset: 0;
      top: 64px;
      background: radial-gradient(ellipse at 50% 0%, rgba(var(--theme-primary-rgb), 0.15) 0%, transparent 50%);
      z-index: 0;
      pointer-events: none;
      transition: background 0.5s ease;
    }

    .bg-decoration {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 1;
    }

    .gradient-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.4;
      transition: background 0.5s ease;

      &.orb-1 {
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(var(--theme-primary-rgb), 0.35) 0%, transparent 70%);
        top: -200px;
        right: -150px;
      }

      &.orb-2 {
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(var(--theme-primary-rgb), 0.25) 0%, transparent 70%);
        bottom: -150px;
        left: -100px;
      }
    }

    .grid-lines {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 80px 80px;
      mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%);
    }

    .noise-overlay {
      position: absolute;
      inset: 0;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }

    .leaderboard-detail-container {
      position: relative;
      z-index: 1;
      padding: 24px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .podium {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 12px;
      padding: 32px 24px 0;
    }

    .podium-spot {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      max-width: 200px;
    }

    .podium-player {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 12px;
    }

    .podium-emblem {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      object-fit: cover;
      margin-bottom: 6px;
      border: 2px solid rgba(255, 255, 255, 0.1);
    }

    .podium-emblem-1 {
      width: 80px;
      height: 80px;
      border-color: rgba(255, 215, 0, 0.5);
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.1);
    }

    .podium-emblem-2 {
      border-color: rgba(192, 192, 192, 0.4);
      box-shadow: 0 0 12px rgba(192, 192, 192, 0.2);
    }

    .podium-emblem-3 {
      border-color: rgba(232, 145, 90, 0.4);
      box-shadow: 0 0 12px rgba(232, 145, 90, 0.2);
    }

    .podium-rank-badge {
      font-weight: 800;
      font-size: 14px;
      margin-bottom: 4px;
      letter-spacing: -0.5px;
    }

    .podium-rank-1 {
      color: #FFD700;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
      font-size: 16px;
    }

    .podium-rank-2 {
      color: #C0C0C0;
      text-shadow: 0 0 6px rgba(192, 192, 192, 0.3);
    }

    .podium-rank-3 {
      color: #E8915A;
      text-shadow: 0 0 6px rgba(232, 145, 90, 0.3);
    }

    .podium-name {
      font-weight: 700;
      font-size: 14px;
      color: white;
      margin-bottom: 4px;
      text-align: center;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .podium-1 .podium-name {
      color: #FFD700;
      font-size: 16px;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
    }

    .podium-2 .podium-name {
      color: #C0C0C0;
    }

    .podium-3 .podium-name {
      color: #E8915A;
    }

    .podium-elo {
      font-size: 13px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 2px;
    }

    .podium-record {
      font-size: 13px;
      margin-bottom: 2px;
    }

    .podium-sep {
      color: rgba(255, 255, 255, 0.3);
      margin: 0 2px;
    }

    .podium-winpct {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .podium-bar {
      width: 100%;
      border-radius: 6px 6px 0 0;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-bottom: none;
    }

    .podium-bar-1 {
      height: 100px;
      background: linear-gradient(180deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.03) 100%);
      border-color: rgba(255, 215, 0, 0.15);
    }

    .podium-bar-2 {
      height: 70px;
      background: linear-gradient(180deg, rgba(192, 192, 192, 0.1) 0%, rgba(192, 192, 192, 0.02) 100%);
      border-color: rgba(192, 192, 192, 0.1);
    }

    .podium-bar-3 {
      height: 50px;
      background: linear-gradient(180deg, rgba(232, 145, 90, 0.1) 0%, rgba(232, 145, 90, 0.02) 100%);
      border-color: rgba(232, 145, 90, 0.1);
    }

    @media (max-width: 480px) {
      .podium {
        gap: 8px;
        padding: 24px 12px 0;
      }

      .podium-emblem {
        width: 48px;
        height: 48px;
        border-radius: 8px;
      }

      .podium-emblem-1 {
        width: 56px;
        height: 56px;
      }

      .podium-name {
        font-size: 12px;
        max-width: 90px;
      }

      .podium-1 .podium-name {
        font-size: 13px;
      }

      .podium-bar-1 { height: 72px; }
      .podium-bar-2 { height: 50px; }
      .podium-bar-3 { height: 36px; }
    }

    .lb-player-link {
      color: rgba(255, 255, 255, 0.95);
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      &:hover {
        color: var(--theme-primary-bright, #ff6b6b);
        border-bottom-color: var(--theme-primary-bright, #ff6b6b);
      }
    }

    .xp-tab .xp-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .xp-joined-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #81c784;
      font-size: 14px;
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .table-container {
      padding: 16px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    table {
      width: 100%;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 12px;

      h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 600;
        text-transform: uppercase;
        color: white;
      }
    }

    .season-badge {
      padding: 6px 16px;
      background: linear-gradient(135deg, var(--theme-primary, #2563EB), var(--theme-primary-dark, #1D4ED8));
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      color: white;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 0 16px rgba(var(--theme-primary-rgb, 37, 99, 235), 0.5), 0 0 32px rgba(var(--theme-primary-rgb, 37, 99, 235), 0.2);
      animation: pulse-glow 2s ease-in-out infinite;
    }

    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 16px rgba(var(--theme-primary-rgb, 37, 99, 235), 0.5), 0 0 32px rgba(var(--theme-primary-rgb, 37, 99, 235), 0.2); }
      50% { box-shadow: 0 0 24px rgba(var(--theme-primary-rgb, 37, 99, 235), 0.7), 0 0 48px rgba(var(--theme-primary-rgb, 37, 99, 235), 0.3); }
    }

    .platform-badge {
      padding: 6px 14px;
      background: var(--theme-primary, #bf2120);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: white;
    }

    .signup-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }


    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: rgba(255, 255, 255, 0.5);

      p {
        margin-top: 16px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: rgba(255, 255, 255, 0.5);

      mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.5;
        margin-bottom: 16px;
        color: var(--theme-primary-bright, #00b4ff);
        transition: color 0.3s ease;
      }

      p {
        margin: 0;
        font-size: 16px;
      }
    }

    .rank-1-row {
      border-left: 3px solid #FFD700;
    }

    .rank-1-badge {
      font-size: 16px;
      font-weight: 800;
      color: #FFD700;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
      letter-spacing: -0.5px;
    }

    .rank-1-name {
      color: #FFD700 !important;
      font-weight: 700;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
    }

    .rank-2-badge {
      font-size: 16px;
      font-weight: 800;
      color: #C0C0C0;
      text-shadow: 0 0 8px rgba(192, 192, 192, 0.5);
      letter-spacing: -0.5px;
    }

    .rank-2-name {
      color: #C0C0C0 !important;
      font-weight: 700;
      text-shadow: 0 0 8px rgba(192, 192, 192, 0.3);
    }

    .rank-2-row {
      border-left: 3px solid rgba(192, 192, 192, 0.4);
    }

    .rank-3-badge {
      font-size: 16px;
      font-weight: 800;
      color: #E8915A;
      text-shadow: 0 0 8px rgba(232, 145, 90, 0.5);
      letter-spacing: -0.5px;
    }

    .rank-3-name {
      color: #E8915A !important;
      font-weight: 700;
      text-shadow: 0 0 8px rgba(232, 145, 90, 0.3);
    }

    .rank-3-row {
      border-left: 3px solid rgba(232, 145, 90, 0.4);
    }

    .rank-1 {
      color: #FFD700 !important;
      font-weight: 700;
      text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
    }

    .rank-2 {
      color: #C0C0C0 !important;
      font-weight: 700;
      text-shadow: 0 0 6px rgba(192, 192, 192, 0.3);
    }

    .rank-3 {
      color: #E8915A !important;
      font-weight: 700;
      text-shadow: 0 0 6px rgba(232, 145, 90, 0.3);
    }

    .wins {
      color: #4caf50 !important;
      font-weight: 600;
    }

    .losses {
      color: #f44336 !important;
      font-weight: 600;
    }

    .record {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 14px;
    }

    .record-sep {
      color: rgba(255, 255, 255, 0.3);
      margin: 0 1px;
    }

    .winpct {
      font-weight: 600;
      font-size: 13px;
    }

    .winpct-hot {
      color: #4caf50 !important;
      text-shadow: 0 0 6px rgba(76, 175, 80, 0.3);
    }

    .winpct-good {
      color: #8bc34a !important;
    }

    .winpct-cold {
      color: #f44336 !important;
    }

    .winpct-none {
      color: rgba(255, 255, 255, 0.3) !important;
    }

    .locked-tab {
      display: flex;
      align-items: center;
      gap: 4px;
      color: rgba(255, 255, 255, 0.4);
    }

    .lock-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(255, 255, 255, 0.4);
    }

    .locked-tab-content {
      opacity: 0.35;
      pointer-events: none;
      user-select: none;
    }

    .placeholder-row {
      opacity: 0.35;
    }

    .placeholder-cell {
      color: rgba(255, 255, 255, 0.3) !important;
    }

    mat-card {
      padding: 0;
    }

    .admin-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .add-player-form {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    .add-player-input {
      width: 160px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      color: white;
      font-size: 14px;

      &:focus {
        outline: none;
        border-color: var(--theme-primary-bright, #64b5f6);
      }

      &::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .rank-input {
      width: 50px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      color: white;
      font-size: 14px;
      text-align: center;

      &:focus {
        outline: none;
        border-color: var(--theme-primary-bright, #64b5f6);
      }
    }

    .ranked-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 16px;

      mat-icon {
        color: rgba(255, 255, 255, 0.6);
        flex-shrink: 0;
      }

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        line-height: 1.4;
      }
    }

    .desktop-only {
      display: inline;
    }

    .mobile-only {
      display: none;
    }

    @media (max-width: 768px) {
      .desktop-only {
        display: none !important;
      }

      .mobile-only {
        display: inline-flex !important;
      }

      // Hide score column on mobile
      .mat-column-score {
        display: none;
      }

      .leaderboard-detail-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .title-row {
        h1 {
          font-size: 24px;
        }
      }

      .platform-badge {
        padding: 5px 10px;
        font-size: 11px;
      }

      .signup-btn {
        width: 100%;
        justify-content: center;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 600;
        background: linear-gradient(135deg, var(--theme-primary, #bf2120) 0%, var(--theme-primary-bright, #ff4444) 100%) !important;
        box-shadow: 0 4px 15px rgba(var(--theme-primary-rgb, 191, 33, 32), 0.3);
      }
    }

    @media (max-width: 480px) {
      .leaderboard-detail-container {
        padding: 12px;
      }

      .header h1 {
        font-size: 20px;
      }

      .table-container {
        padding: 12px 8px;
      }
    }
  `]
})
export class LeaderboardDetailComponent implements OnInit {
  game = '';
  platform = '';
  currentTab: 'RANKED' | 'XP' = 'RANKED';
  rankedColumns = ['rank', 'username', 'record', 'winpct'];
  xpColumns = ['rank', 'username', 'score', 'record', 'winpct'];

  leaderboard: Leaderboard | null = null;
  rankedData: DisplayEntry[] = [];
  xpData: DisplayEntry[] = [];
  xpOptIn = false;
  loading = true;
  editingRanks = false;
  savingRanks = false;
  editedRanks: Record<string, number> = {};
  addPlayerUsername = '';
  addingPlayer = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public authService: AuthService,
    private leaderboardsService: LeaderboardsService,
    private themeService: ThemeService
  ) {}

  get podiumPlayers(): DisplayEntry[] {
    return this.rankedData.filter(e => !e.placeholder && e.rank <= 3);
  }

  get xpPodiumPlayers(): DisplayEntry[] {
    return this.xpData.filter(e => !e.placeholder && e.rank <= 3);
  }

  get isAdmin(): boolean {
    return this.authService.currentUser()?.role === 'admin';
  }

  get gameImage(): string {
    const gameLower = this.game.toLowerCase();
    return `/assets/games/${gameLower}.webp`;
  }

  ngOnInit(): void {
    this.game = this.route.snapshot.paramMap.get('game') || '';
    this.platform = this.route.snapshot.paramMap.get('platform') || '';

    // Set theme based on platform
    const platformMap: Record<string, Platform> = {
      'plutonium': 'Plutonium',
      'xbox': 'Xbox',
      'ps3': 'PS3'
    };
    const themePlatform = platformMap[this.platform.toLowerCase()];
    if (themePlatform) {
      this.themeService.setPlatform(themePlatform);
    }

    this.loadLeaderboardData();
  }

  private loadLeaderboardData(): void {
    this.loading = true;

    // First get the leaderboard by game and platform
    this.leaderboardsService.getByGameAndPlatform(this.game, this.platform).subscribe({
      next: (leaderboard) => {
        this.leaderboard = leaderboard;
        // Load entries (public)
        forkJoin({
          ranked: this.leaderboardsService.getEntries(leaderboard.id, 'ranked'),
          xp: this.leaderboardsService.getEntries(leaderboard.id, 'xp')
        }).subscribe({
          next: (results) => {
            this.rankedData = this.padToTen(results.ranked.map(e => this.mapToDisplayEntry(e, 'ranked')));
            this.xpData = this.padToTen(results.xp.map(e => this.mapToDisplayEntry(e, 'xp')));
            this.loading = false;

            // Check if user is signed up (only if authenticated)
            if (this.authService.isAuthenticated()) {
              this.leaderboardsService.getMyEntry(leaderboard.id).subscribe({
                next: (myEntry) => {
                  this.xpOptIn = !!myEntry.entry?.xpOptIn;
                },
                error: () => {
                  this.xpOptIn = false;
                }
              });
            } else {
              this.xpOptIn = false;
            }
          },
          error: () => {
            this.snackBar.open('Failed to load leaderboard entries', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      },
      error: (err) => {
        // If leaderboard doesn't exist yet (404), just show empty state
        if (err.status === 404) {
          this.rankedData = this.padToTen([]);
          this.xpData = this.padToTen([]);
          this.loading = false;
        } else {
          this.snackBar.open('Failed to load leaderboard', 'Close', { duration: 3000 });
          this.loading = false;
        }
      }
    });
  }

  private mapToDisplayEntry(entry: LeaderboardEntry, type: 'ranked' | 'xp'): DisplayEntry {
    const eloScore = entry.elo ?? entry.xp;
    return {
      id: entry.id,
      rank: entry.rank,
      userId: entry.userId,
      username: entry.username,
      emblem: entry.emblem,
      score: type === 'ranked' ? entry.rankScore : eloScore,
      wins: entry.wins,
      losses: entry.losses
    };
  }

  xpJoin(): void {
    if (!this.leaderboard) return;
    if (!this.authService.isAuthenticated()) {
      this.dialog.open(AuthModalComponent, {
        width: '400px',
        data: { message: 'Sign in to join the XP ladder' },
      });
      return;
    }
    this.leaderboardsService.xpJoin(this.leaderboard.id).subscribe({
      next: () => {
        this.snackBar.open('You joined the XP ladder!', 'Close', { duration: 3000 });
        this.loadLeaderboardData();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to join XP ladder', 'Close', { duration: 3000 });
      },
    });
  }

  signUp(): void {
    if (!this.leaderboard) return;

    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      // Store pending action and show auth modal
      this.authService.storePendingAction({
        type: 'LEADERBOARD_SIGNUP',
        payload: { leaderboardId: this.leaderboard.id },
        returnUrl: this.router.url
      });
      this.dialog.open(AuthModalComponent, {
        width: '400px',
        data: { message: 'Sign in to join this leaderboard' }
      });
      return;
    }

    this.leaderboardsService.signup(this.leaderboard.id).subscribe({
      next: () => {
        this.snackBar.open('Successfully signed up for the leaderboard!', 'Close', { duration: 3000 });
        this.loadLeaderboardData(); // Reload to show updated list
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to sign up', 'Close', { duration: 3000 });
      }
    });
  }

  onTabChange(event: any): void {
    this.currentTab = event.index === 0 ? 'RANKED' : 'XP';
  }

  private padToTen(entries: DisplayEntry[]): DisplayEntry[] {
    const padded = [...entries];
    while (padded.length < 10) {
      padded.push({
        id: '',
        rank: padded.length + 1,
        userId: '',
        username: '',
        emblem: null,
        score: 0,
        wins: 0,
        losses: 0,
        placeholder: true,
      });
    }
    return padded;
  }

  getWinPct(entry: DisplayEntry): number {
    const total = entry.wins + entry.losses;
    if (total === 0) return 0;
    return Math.round((entry.wins / total) * 100);
  }

  getRankClass(rank: number): string {
    if (rank <= 3) {
      return `rank-${rank}`;
    }
    return '';
  }

  addPlayer(): void {
    if (!this.leaderboard || this.addingPlayer || !this.addPlayerUsername.trim()) return;
    this.addingPlayer = true;

    this.leaderboardsService.addPlayer(this.leaderboard.id, this.addPlayerUsername.trim()).subscribe({
      next: () => {
        this.snackBar.open(`Added ${this.addPlayerUsername.trim()} to the leaderboard`, 'Close', { duration: 3000 });
        this.addPlayerUsername = '';
        this.addingPlayer = false;
        this.loadLeaderboardData();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to add player', 'Close', { duration: 3000 });
        this.addingPlayer = false;
      },
    });
  }

  startEditRanks(): void {
    this.editingRanks = true;
    this.editedRanks = {};
    for (const entry of this.rankedData) {
      if (!entry.placeholder) {
        this.editedRanks[entry.userId] = entry.rank;
      }
    }
  }

  cancelEditRanks(): void {
    this.editingRanks = false;
    this.editedRanks = {};
  }

  saveRanks(): void {
    if (!this.leaderboard || this.savingRanks) return;
    this.savingRanks = true;

    const ranks = Object.entries(this.editedRanks).map(([userId, rank]) => ({
      userId,
      rank: Number(rank),
    }));

    this.leaderboardsService.updateRanks(this.leaderboard.id, ranks).subscribe({
      next: () => {
        this.snackBar.open('Ranks updated', 'Close', { duration: 3000 });
        this.editingRanks = false;
        this.savingRanks = false;
        this.loadLeaderboardData();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to update ranks', 'Close', { duration: 3000 });
        this.savingRanks = false;
      },
    });
  }

}
