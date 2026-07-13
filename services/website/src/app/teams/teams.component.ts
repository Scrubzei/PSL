import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TeamsService, Team, TeamInvite } from './teams.service';
import { AuthService } from '../auth/auth.service';
import { CreateTeamDialogComponent } from './create-team-dialog.component';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatSnackBarModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <!-- Match Ticker -->
      <div class="ticker">
        <div class="ticker-fade-left"></div>
        <div class="ticker-fade-right"></div>
        <div class="ticker-inner">
          @for (m of liveMatches; track m.team1) {
            <div class="ticker-card">
              <div class="tc-badge" [class.live]="m.status === 'LIVE'">
                <span class="tc-badge-status">{{ m.status }}</span>
                <span class="tc-badge-game">{{ m.game }}</span>
              </div>
              <div class="tc-body">
                <div class="tc-side" [class.won]="m.winner === m.team1" [class.lost]="m.winner && m.winner !== m.team1">
                  <span class="tc-captain">{{ m.team1 }}</span>
                  <span class="tc-roster">{{ m.players1.join(' · ') }}</span>
                </div>
                <div class="tc-divider"><span>VS</span></div>
                <div class="tc-side" [class.won]="m.winner === m.team2" [class.lost]="m.winner && m.winner !== m.team2">
                  <span class="tc-captain">{{ m.team2 }}</span>
                  <span class="tc-roster">{{ m.players2.join(' · ') }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Background -->
      <div class="bg">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
      </div>

      <!-- Hero Banner -->
      <div class="hero-banner">
        <div class="banner-bg">
          <div class="banner-gradient"></div>
        </div>
        <div class="banner-content">
          <div class="banner-left">
            <h1>Teams</h1>
            <p class="subtitle">{{ teams.length }} registered teams competing across PSL</p>
          </div>
          <div class="banner-right">
            <button class="btn-create" (click)="openCreateDialog()">
              <mat-icon>add</mat-icon>
              Create Team
            </button>
          </div>
        </div>
        <div class="banner-chips">
          <div class="filter-chips">
            <button class="chip" [class.active]="!gameFilter" (click)="gameFilter = ''">All</button>
            @for (g of gameFilters; track g) {
              <button class="chip" [class.active]="gameFilter === g" (click)="gameFilter = g">{{ g }}</button>
            }
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
      } @else {

        <!-- Pending Invites -->
        @if (invites.length > 0) {
          <div class="container">
            <div class="section-label">Pending Invites</div>
            <div class="invite-list">
              @for (inv of invites; track inv.id) {
                <div class="invite-card">
                  <div class="invite-info">
                    <span class="invite-tag" [style.color]="inv.team?.color || '#A855F7'">{{ inv.team?.tag }}</span>
                    <span class="invite-name">{{ inv.team?.name }}</span>
                    <span class="invite-detail">{{ inv.team?.game }} · from {{ inv.invitedBy?.username }}</span>
                  </div>
                  <div class="invite-actions">
                    <button class="btn-accept" (click)="acceptInvite(inv)">Accept</button>
                    <button class="btn-decline" (click)="declineInvite(inv)">Decline</button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Teams Grid -->
        @if (filteredTeams.length > 0) {
          <div class="container">
            <div class="teams-grid">
              @for (team of filteredTeams; track team.id; let i = $index) {
                <a [routerLink]="['/teams', team.id]" class="team-card" [style.animation-delay]="i * 0.05 + 's'" [style.--team-color]="team.color || '#7C3AED'">
                  <!-- Diagonal slash -->
                  <div class="card-slash" [style.background]="'linear-gradient(135deg, transparent 45%, ' + (team.color || '#7C3AED') + '30 45%)'"></div>
                  <!-- Top glow -->
                  <div class="card-top-glow" [style.background]="'radial-gradient(ellipse at 50% 0%, ' + (team.color || '#7C3AED') + '15, transparent 70%)'"></div>
                  <!-- Color accent -->
                  <div class="card-accent" [style.background]="'linear-gradient(180deg, ' + (team.color || '#7C3AED') + ' 0%, transparent 100%)'"></div>

                  <!-- Team identity -->
                  <div class="card-header">
                    <div class="card-header-left">
                      <h3>{{ team.name }}</h3>
                      <span class="captain-line">CPT {{ getCaptain(team) }}</span>
                    </div>
                    <span class="card-game-badge">{{ team.game }}</span>
                  </div>

                  <!-- Record strip -->
                  <div class="card-record">
                    <div class="record-stat">
                      <span class="record-val win-color">{{ getTeamRecord(team).wins }}</span>
                    </div>
                    <span class="record-dash">-</span>
                    <div class="record-stat">
                      <span class="record-val loss-color">{{ getTeamRecord(team).losses }}</span>
                    </div>
                    <div class="record-div"></div>
                    <div class="record-stat">
                      <span class="record-val" [class.win-color]="getTeamRecord(team).winPct >= 60" [class.loss-color]="getTeamRecord(team).winPct < 40">{{ getTeamRecord(team).winPct }}%</span>
                    </div>
                    <div class="form-dots">
                      @for (dot of getTeamRecord(team).form; track $index) {
                        <span class="form-dot" [class.win]="dot" [class.loss]="!dot"></span>
                      }
                    </div>
                  </div>

                  <!-- Roster -->
                  <div class="card-roster">
                    @for (m of getMembers(team); track m.id) {
                      <span class="roster-name">{{ m.user?.username }}</span>
                    }
                  </div>

                </a>
              }
            </div>
          </div>
        } @else if (!loading && invites.length === 0) {
          <div class="empty">
            <mat-icon>groups</mat-icon>
            <h2>No teams yet</h2>
            <p>Create a team or wait for an invite from a captain.</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { background: #0a0a0f; min-height: 100%; position: relative; overflow: hidden; }

    /* Ticker */
    .ticker {
      background: #0a0a0f; overflow-x: auto; position: relative;
      scrollbar-width: none; -ms-overflow-style: none;
      &::-webkit-scrollbar { display: none; }
    }
    .ticker-fade-left, .ticker-fade-right {
      position: absolute; top: 0; bottom: 0; width: 80px; z-index: 2; pointer-events: none;
    }
    .ticker-fade-left { left: 0; background: linear-gradient(to right, #0a0a0f, transparent); }
    .ticker-fade-right { right: 0; background: linear-gradient(to left, #0a0a0f, transparent); }
    .ticker-inner { display: flex; gap: 12px; padding: 16px 20px; min-width: max-content; }
    .ticker-card {
      background: linear-gradient(135deg, #161620 0%, #1a1428 100%);
      border: 1px solid rgba(124,58,237,0.12); border-radius: 10px;
      min-width: 280px; overflow: hidden; flex-shrink: 0;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:hover { border-color: rgba(124,58,237,0.25); box-shadow: 0 4px 20px rgba(124,58,237,0.08); }
    }
    .tc-badge {
      padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid rgba(124,58,237,0.08);
      &.live .tc-badge-status { color: #ef4444; text-shadow: 0 0 8px rgba(239,68,68,0.4); }
      &.live { background: linear-gradient(90deg, rgba(239,68,68,0.08), transparent); border-bottom-color: rgba(239,68,68,0.1); }
    }
    .tc-badge-status { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #A855F7; }
    .tc-badge-game { font-size: 12px; font-weight: 600; color: rgba(168,85,247,0.5); text-transform: uppercase; letter-spacing: 0.5px; }
    .tc-body { display: flex; align-items: stretch; padding: 12px 16px; gap: 0; }
    .tc-side {
      flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0;
      &.won .tc-captain { color: #22c55e; }
      &.won .tc-roster { color: rgba(34,197,94,0.35); }
      &.lost .tc-captain { color: rgba(255,255,255,0.25); }
      &.lost .tc-roster { color: rgba(255,255,255,0.1); }
    }
    .tc-captain { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tc-roster { font-size: 11px; font-weight: 400; color: rgba(255,255,255,0.25); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tc-divider {
      display: flex; align-items: center; padding: 0 14px; flex-shrink: 0;
      span { font-size: 10px; font-weight: 700; color: rgba(124,58,237,0.3); letter-spacing: 1px; }
    }

    /* Background */
    .bg { position: absolute; inset: 0; pointer-events: none; }
    .orb {
      position: absolute; border-radius: 50%; filter: blur(120px);
      &.orb-1 { width: 500px; height: 500px; background: rgba(124, 58, 237, 0.1); top: -100px; right: -100px; }
      &.orb-2 { width: 400px; height: 400px; background: rgba(220, 38, 38, 0.06); bottom: 200px; left: -100px; }
    }
    .bg-wordmarks {
      position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%);
      display: flex; gap: 80px; white-space: nowrap; overflow: hidden;
      font-family: 'Chakra Petch', sans-serif; font-size: 120px; font-weight: 800;
      color: rgba(255,255,255,0.02); text-transform: uppercase; letter-spacing: 8px;
      user-select: none;
    }

    /* Hero Banner */
    .hero-banner {
      position: relative; z-index: 1; overflow: hidden; margin-bottom: 32px;
    }

    .banner-bg {
      position: absolute; inset: 0; pointer-events: none;
    }

    .banner-gradient {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(220,38,38,0.06) 60%, transparent 100%);
    }


    .banner-content {
      position: relative; display: flex; align-items: center; justify-content: space-between;
      max-width: 1100px; margin: 0 auto; padding: 40px 32px 20px; gap: 24px;
    }

    .banner-left {
      h1 {
        font-family: 'Chakra Petch', sans-serif; font-size: 56px; font-weight: 700;
        color: white; margin: 0; text-transform: uppercase; letter-spacing: 2px; line-height: 1;
      }
      .subtitle { font-size: 16px; color: rgba(255,255,255,0.4); margin: 6px 0 0; }
    }

    .banner-chips {
      position: relative; max-width: 1100px; margin: 0 auto; padding: 12px 32px 20px;
    }

    .filter-chips {
      display: flex; gap: 6px;
    }
    .chip {
      padding: 7px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.4);
      font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
      cursor: pointer; font-family: inherit; transition: all 0.15s;
      &:hover { border-color: rgba(124,58,237,0.3); color: rgba(255,255,255,0.6); }
      &.active { background: rgba(124,58,237,0.15); border-color: rgba(124,58,237,0.4); color: #A855F7; }
    }

    .btn-create {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 14px 32px; background: linear-gradient(135deg, #7C3AED, #6D28D9);
      border: none; border-radius: 10px; color: white; font-size: 16px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all 0.2s;
      box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124, 58, 237, 0.4); }
    }

    .container { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 0 24px 60px; }
    .loading { position: relative; z-index: 1; display: flex; justify-content: center; padding: 80px 0; }

    .section-label {
      font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
      color: #A855F7; margin-bottom: 14px;
    }

    /* Invites */
    .invite-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 40px; }
    .invite-card {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 14px 20px; background: rgba(124,58,237,0.04); border: 1px solid rgba(124,58,237,0.12);
      border-radius: 10px; transition: border-color 0.2s;
      &:hover { border-color: rgba(124,58,237,0.25); }
    }
    .invite-info { display: flex; align-items: center; gap: 12px; }
    .invite-tag { font-size: 15px; font-weight: 800; }
    .invite-name { font-size: 14px; color: white; font-weight: 600; }
    .invite-detail { font-size: 12px; color: rgba(255,255,255,0.3); }
    .invite-actions { display: flex; gap: 8px; }
    .btn-accept {
      padding: 7px 18px; background: #22c55e; border: none; border-radius: 6px;
      color: white; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit;
      &:hover { filter: brightness(1.1); }
    }
    .btn-decline {
      padding: 7px 18px; background: transparent; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px; color: rgba(255,255,255,0.5); font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      &:hover { border-color: rgba(255,255,255,0.2); color: white; }
    }

    /* Grid */
    .teams-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;
    }

    /* Trading Card */
    .team-card {
      --team-color: #7C3AED;
      position: relative; text-decoration: none; color: inherit; display: flex; flex-direction: column;
      padding: 0; overflow: hidden;
      background: #12121e; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      animation: cardIn 0.45s ease forwards; opacity: 0;

      &:hover {
        transform: translateY(-10px) scale(1.02);
        border-color: var(--team-color);
        box-shadow:
          0 24px 60px rgba(0,0,0,0.5),
          0 0 30px color-mix(in srgb, var(--team-color) 25%, transparent);

        .card-watermark { opacity: 0.08; transform: translateY(-50%) scale(1.05); }
        .card-accent { opacity: 0.4; }
        .card-top-glow { opacity: 1; }
        .card-slash { opacity: 1; }
      }
    }

    @keyframes cardIn {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .card-watermark {
      position: absolute; top: 50%; right: -8px; transform: translateY(-50%);
      font-family: 'Chakra Petch', sans-serif; font-size: 110px; font-weight: 800;
      color: white; opacity: 0.03; letter-spacing: 4px; pointer-events: none;
      transition: all 0.4s; line-height: 1;
    }

    .card-slash {
      position: absolute; inset: 0; opacity: 0.6; pointer-events: none; transition: opacity 0.3s;
    }

    .card-top-glow {
      position: absolute; top: 0; left: 0; right: 0; height: 120px;
      opacity: 0; pointer-events: none; transition: opacity 0.4s;
    }

    .card-accent {
      position: absolute; top: 0; left: 0; width: 3px; height: 100%;
      opacity: 0.6; transition: opacity 0.3s;
    }

    /* Card header */
    .card-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding: 24px 20px 16px; position: relative;
    }
    .card-header-left { min-width: 0; }

    .team-card h3 {
      margin: 0 0 4px; font-family: 'Chakra Petch', sans-serif;
      font-size: 26px; font-weight: 700; color: white;
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    .captain-line {
      font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.3);
      text-transform: uppercase; letter-spacing: 1px;
    }

    .card-game-badge {
      font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3);
      text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
      padding: 4px 10px; border-radius: 5px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; margin-top: 4px;
    }

    /* Record strip */
    .card-record {
      display: flex; align-items: center; gap: 0; padding: 14px 20px;
      background: rgba(0,0,0,0.25); border-top: 1px solid rgba(255,255,255,0.04);
      border-bottom: 1px solid rgba(255,255,255,0.04); position: relative;
    }
    .record-stat {
      display: flex; align-items: baseline; gap: 4px; padding: 0 14px;
      &:first-child { padding-left: 0; }
    }
    .record-val {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 18px; font-weight: 700; color: white; font-variant-numeric: tabular-nums;
      &.win-color { color: #22c55e; }
      &.loss-color { color: #ef4444; }
    }
    .record-key { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.25); text-transform: uppercase; }
    .record-dash { font-size: 16px; font-weight: 700; color: rgba(255,255,255,0.15); padding: 0 2px; }
    .record-div { width: 1px; height: 18px; background: rgba(255,255,255,0.06); margin: 0 10px; }
    .form-dots { display: flex; gap: 5px; margin-left: auto; align-items: center; }
    .form-dot {
      width: 9px; height: 9px; border-radius: 50%;
      &.win { background: #22c55e; box-shadow: 0 0 4px rgba(34,197,94,0.4); }
      &.loss { background: #ef4444; box-shadow: 0 0 4px rgba(239,68,68,0.4); }
    }

    /* Roster */
    .card-roster {
      display: flex; flex-wrap: wrap; gap: 6px; padding: 16px 20px 24px; position: relative;
      min-height: 44px; align-content: flex-start;
    }
    .roster-name {
      padding: 4px 12px; border-radius: 5px; font-size: 12px; font-weight: 500;
      color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.03);
    }

    .empty {
      position: relative; z-index: 1; text-align: center; padding: 80px 20px;
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: rgba(255,255,255,0.1); margin-bottom: 16px; }
      h2 { margin: 0 0 8px; font-size: 20px; color: white; }
      p { margin: 0; font-size: 14px; color: rgba(255,255,255,0.3); }
    }

    @media (max-width: 600px) {
      .banner-left h1 { font-size: 32px; }
      .banner-content { flex-direction: column; align-items: flex-start; padding-bottom: 8px; }
      .teams-grid { grid-template-columns: 1fr; }
      .invite-card { flex-direction: column; align-items: flex-start; }
      .filter-chips { flex-wrap: wrap; }
    }
  `]
})
export class TeamsComponent implements OnInit {
  teams: Team[] = [];
  invites: TeamInvite[] = [];
  loading = true;
  gameFilter = '';
  gameFilters = ['COD4', 'MW2', 'BO1', 'MW3', 'BO2'];

  liveMatches = [
    { status: 'LIVE', game: 'MW2 Comp', team1: 'Darius', team2: 'LavishHardyz', players1: ['Darius', 'Levi', 'S3l', 'M r G'], players2: ['Trippy', 'Fartache', 'khmer', 'Drama'], winner: '' },
    { status: 'LIVE', game: 'Cod4 Comp', team1: 'chizmdg', team2: 'Myr', players1: ['chizmdg', 'rudy', 'LockDown', 'sorrow'], players2: ['Myr', 'Raxeo', 'Lemmy', 'ClubyG'], winner: '' },
    { status: 'Queue', game: 'MW2 Comp', team1: 'Myr', team2: 'Versace', players1: ['Levi', 'mahogany', 'Myr', 'False'], players2: ['Versace', 'YuKi', 'Anisity', 'scueby'], winner: 'Myr' },
    { status: 'Queue', game: 'MW2 Comp', team1: 'Versace', team2: 'Raxeo', players1: ['Versace', 'khmer', 'scueby', 'Banjo'], players2: ['Raxeo', 'RapTo', 'accurra', 'Punish'], winner: 'Raxeo' },
    { status: 'Queue', game: 'BO1 Comp', team1: 'Off The Magic', team2: 'Big British Brute', players1: ['Apollo', 'livypoo', 'Lemmy', 'Off The Magic'], players2: ['Brute', 'ClubyG', 'Harmony', 'accurra'], winner: 'Big British Brute' },
    { status: 'Queue', game: 'Cod4 Comp', team1: 'chizmdg', team2: 'Chimp', players1: ['Raxeo', 'chizmdg', 'Wubbie', 'LockDown'], players2: ['Burb5rry', 'Chimp', 'Lemmy', 'STyLz'], winner: 'Chimp' },
    { status: 'Queue', game: 'MW2 Comp', team1: 'Ambush', team2: 'LavishHardyz', players1: ['Fartache', 'Levi', 'Ambush', 'Drama'], players2: ['Trippy', 'khmer', 'Darius', 'Burb5rry'], winner: 'LavishHardyz' },
    { status: 'Queue', game: 'BO1 Comp', team1: 'Raxeo', team2: 'Twizzy', players1: ['Myr', 'Harmony', 'Off The Magic', 'Raxeo'], players2: ['Twizzy', 'Apollo', 'Hanndys', 'Turboz'], winner: 'Twizzy' },
  ];

  get filteredTeams(): Team[] {
    if (!this.gameFilter) return this.teams;
    return this.teams.filter(t => t.game === this.gameFilter);
  }

  getCaptain(team: Team): string {
    const cap = team.memberships?.find(m => m.role === 'captain');
    return cap?.user?.username || team.captain?.username || '?';
  }

  getMembers(team: Team): any[] {
    return (team.memberships || []).filter(m => m.role !== 'captain');
  }

  getTeamRecord(team: Team): { wins: number; losses: number; winPct: number; form: boolean[] } {
    // Seeded fake data based on team id for consistency
    const seed = team.id.charCodeAt(0);
    const wins = 8 + (seed % 20);
    const losses = 3 + (seed % 12);
    const winPct = Math.round((wins / (wins + losses)) * 100);
    const form = Array.from({ length: 5 }, (_, i) => ((seed + i) % 3) !== 0);
    return { wins, losses, winPct, form };
  }

  constructor(
    private teamsService: TeamsService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.teamsService.getMyTeams().subscribe({
      next: (teams) => {
        this.teams = teams.length ? teams : this.dummyTeams;
        this.teamsService.getMyInvites().subscribe({
          next: (invites) => { this.invites = invites.length ? invites : this.dummyInvites; this.loading = false; },
          error: () => { this.invites = this.dummyInvites; this.loading = false; },
        });
      },
      error: () => { this.teams = this.dummyTeams; this.invites = this.dummyInvites; this.loading = false; },
    });
  }

  private mk = (id: string, userId: string, username: string, role: 'captain' | 'member' = 'member') =>
    ({ id, userId, role, joinedAt: '2026-07-01', user: { id: userId, username, discordId: userId } });

  private dummyTeams: Team[] = [
    {
      id: '1', name: 'AiMz', tag: 'AIMZ', game: 'Black Ops 1', region: 'NA', color: '#7C3AED',
      captainId: 'u1', captain: { id: 'u1', username: 'Rizon' }, createdAt: '2026-06-30T00:00:00Z',
      memberships: [
        this.mk('m1', 'u1', 'Rizon', 'captain'), this.mk('m2', 'u2', 'Accuracy'),
        this.mk('m3', 'u3', 'ClubyG'), this.mk('m4', 'u4', 'Dacoaco'), this.mk('m5', 'u5', 'Raxeo'),
      ],
    },
    {
      id: '2', name: 'dig', tag: 'DIG', game: 'Black Ops 1', region: 'NA', color: '#DC2626',
      captainId: 'u6', captain: { id: 'u6', username: 'Xen Soulmate' }, createdAt: '2026-06-30T00:00:00Z',
      memberships: [
        this.mk('m6', 'u6', 'Xen Soulmate', 'captain'), this.mk('m7', 'u7', 'GMBTx'),
        this.mk('m8', 'u8', 'imGMBYx'), this.mk('m9', 'u9', 'Xen Legacy'), this.mk('m10', 'u10', 'Xen YabbaDabba'),
      ],
    },
    {
      id: '3', name: 'FeaR', tag: 'FEAR', game: 'Black Ops 1', region: 'NA', color: '#22c55e',
      captainId: 'u11', captain: { id: 'u11', username: 'Bad Dad' }, createdAt: '2026-07-01T00:00:00Z',
      memberships: [
        this.mk('m11', 'u11', 'Bad Dad', 'captain'), this.mk('m12', 'u12', '収量'),
        this.mk('m13', 'u13', 'Legend'), this.mk('m14', 'u14', 'Ninja'), this.mk('m15', 'u15', 'OG Eyres'),
      ],
    },
    {
      id: '4', name: 'Xm', tag: 'XM', game: 'Black Ops 1', region: 'NA', color: '#f59e0b',
      captainId: 'u16', captain: { id: 'u16', username: 'Convo Xm' }, createdAt: '2026-07-02T00:00:00Z',
      memberships: [
        this.mk('m16', 'u16', 'Convo Xm', 'captain'), this.mk('m17', 'u17', 'cL Junie'),
        this.mk('m18', 'u18', 'Accionar'), this.mk('m19', 'u19', 'Mr. Sweep'),
      ],
    },
    {
      id: '5', name: 'Show', tag: 'SHOW', game: 'Black Ops 1', region: 'NA', color: '#a855f7',
      captainId: 'u20', captain: { id: 'u20', username: 'Aqua' }, createdAt: '2026-07-05T00:00:00Z',
      memberships: [
        this.mk('m20', 'u20', 'Aqua', 'captain'), this.mk('m21', 'u21', 'Twizzy'),
        this.mk('m22', 'u22', 'Show Perfection'), this.mk('m23', 'u23', 'Slime'), this.mk('m24', 'u24', 'Tails'),
      ],
    },
    {
      id: '6', name: 'oB', tag: 'OB', game: 'Black Ops 1', region: 'NA', color: '#ef4444',
      captainId: 'u25', captain: { id: 'u25', username: 'VioLenT' }, createdAt: '2026-07-07T00:00:00Z',
      memberships: [
        this.mk('m25', 'u25', 'VioLenT', 'captain'), this.mk('m26', 'u26', 'ehxzo'),
        this.mk('m27', 'u27', 'Feedz'), this.mk('m28', 'u28', 'Lind'), this.mk('m29', 'u29', 'eMpoZe PunK'),
      ],
    },
    {
      id: '7', name: 'SkyzCentral', tag: 'SC', game: 'Black Ops 1', region: 'NA', color: '#3b82f6',
      captainId: 'u30', captain: { id: 'u30', username: 'Decree' }, createdAt: '2026-07-08T00:00:00Z',
      memberships: [
        this.mk('m30', 'u30', 'Decree', 'captain'), this.mk('m31', 'u31', 'lemmy'),
        this.mk('m32', 'u32', '6fo'), this.mk('m33', 'u33', 'ghztly'), this.mk('m34', 'u34', 'ivy'),
      ],
    },
    {
      id: '8', name: 'hellRaisers', tag: 'HR', game: 'Black Ops 1', region: 'NA', color: '#64748b',
      captainId: 'u35', captain: { id: 'u35', username: 'drx' }, createdAt: '2026-07-08T00:00:00Z',
      memberships: [
        this.mk('m35', 'u35', 'drx', 'captain'), this.mk('m36', 'u36', 'S3l'),
        this.mk('m37', 'u37', '4uH'), this.mk('m38', 'u38', 'Wubbie'), this.mk('m39', 'u39', 'BLASTA'),
      ],
    },
  ];

  private dummyInvites: TeamInvite[] = [];

  openCreateDialog(): void {
    const ref = this.dialog.open(CreateTeamDialogComponent, { width: '440px' });
    ref.afterClosed().subscribe((result) => { if (result) this.load(); });
  }

  acceptInvite(inv: TeamInvite): void {
    this.teamsService.acceptInvite(inv.id).subscribe({
      next: () => { this.snackBar.open('Joined team!', 'Close', { duration: 3000 }); this.load(); },
      error: (err) => this.snackBar.open(err.error?.message || 'Failed', 'Close', { duration: 3000 }),
    });
  }

  declineInvite(inv: TeamInvite): void {
    this.teamsService.declineInvite(inv.id).subscribe({
      next: () => { this.snackBar.open('Invite declined', 'Close', { duration: 2000 }); this.load(); },
    });
  }
}
