import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TeamsService, Team } from './teams.service';
import { SafePipe } from '../shared/safe.pipe';

interface PlayerStat {
  username: string;
  role: 'captain' | 'member';
  wins: number;
  losses: number;
  kd: number;
  winPct: number;
  bestKd?: boolean;
}

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule, SafePipe],
  template: `
    <div class="page">
      @if (loading) {
        <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (team) {

        <!-- Hero -->
        <div class="hero" [style.--tc]="team.color || '#7C3AED'">
          <div class="hero-wash"></div>
          <div class="hero-content">
            <div class="hero-nav">
              <a routerLink="/teams" class="back">&larr; Teams</a>
              <a [routerLink]="['/teams/h2h']" [queryParams]="{ t1: team.id }" class="h2h-link">
                <mat-icon>compare_arrows</mat-icon> Head to Head
              </a>
            </div>
            <div class="hero-split">
              <div class="hero-left">
                <h1>{{ team.name }}</h1>
                <div class="hero-meta">
                  <span>{{ team.game }}</span>
                  <span class="dot"></span>
                  <span>{{ team.region }}</span>
                  <span class="dot"></span>
                  <span>{{ team.memberships?.length || 0 }} players</span>
                </div>
                <div class="stat-tiles">
                  <div class="stat-tile rank-tile">
                    <span class="tile-val">#{{ teamStats.rank }}</span>
                    <span class="tile-key">Rank</span>
                  </div>
                  <div class="stat-tile">
                    <span class="tile-val win-color">{{ teamStats.wins }}</span>
                    <span class="tile-key">Wins</span>
                  </div>
                  <div class="stat-tile">
                    <span class="tile-val loss-color">{{ teamStats.losses }}</span>
                    <span class="tile-key">Losses</span>
                  </div>
                  <div class="stat-tile">
                    <span class="tile-val" [class.win-color]="teamStats.winPct >= 60" [class.loss-color]="teamStats.winPct < 40">{{ teamStats.winPct }}%</span>
                    <span class="tile-key">Win Rate</span>
                  </div>
                  <div class="stat-tile">
                    <span class="tile-val">{{ teamStats.avgKd }}</span>
                    <span class="tile-key">Avg K/D</span>
                  </div>
                  <div class="form-strip">
                    @for (dot of teamStats.form; track $index) {
                      <span class="form-dot" [class.win]="dot" [class.loss]="!dot"></span>
                    }
                    <span class="streak-label">{{ teamStats.streak }}</span>
                  </div>
                </div>
              </div>
              <div class="hero-right">
                <div class="hero-video">
                  <iframe
                    [src]="teamVideoUrl | safe"
                    frameborder="0"
                    allow="autoplay; encrypted-media"
                    allowfullscreen>
                  </iframe>
                  <div class="video-overlay"></div>
                </div>
                <p class="video-caption">{{ teamVideoTitle }}</p>
              </div>
            </div>
          </div>
          <div class="hero-diagonal"></div>
        </div>

        <!-- Roster (full width) -->
        <div class="roster-section">
          <div class="section-header">Roster</div>
          <div class="roster-cards">
            @for (p of playerStats; track p.username) {
              <div class="player-card" [class.is-captain]="p.role === 'captain'" [class.best-kd]="p.bestKd" [style.--tc]="team.color || '#7C3AED'">
                <div class="pc-slash"></div>
                <div class="pc-name">{{ p.username }}</div>
                <div class="pc-stats">
                  <div class="pc-stat">
                    <span class="pc-key">Record</span>
                    <span class="pc-val">{{ p.wins }}-{{ p.losses }}</span>
                  </div>
                  <div class="pc-stat">
                    <span class="pc-key">Win%</span>
                    <span class="pc-val" [class.good]="p.winPct >= 55" [class.bad]="p.winPct < 45">{{ p.winPct }}%</span>
                  </div>
                  <div class="pc-stat">
                    <span class="pc-key">K/D</span>
                    <span class="pc-val" [class.good]="p.kd >= 1.2" [class.bad]="p.kd < 0.9">{{ p.kd }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Two column body -->
        <div class="body">
          <div class="main-col">
            <div class="section-header">Recent Matches</div>
            <div class="matches">
              @for (m of recentMatches; track m.id) {
                <div class="match-row" [class.win]="m.result === 'W'" [class.loss]="m.result === 'L'">
                  <span class="match-chip" [class.w]="m.result === 'W'" [class.l]="m.result === 'L'">{{ m.result }}</span>
                  <span class="match-vs">vs</span>
                  <span class="match-opponent">{{ m.opponent }}</span>
                  <div class="match-score-wrap">
                    <span class="match-score" [class.win-score]="m.result === 'W'">{{ m.myScore }}</span>
                    <span class="match-dash">-</span>
                    <span class="match-score" [class.win-score]="m.result === 'L'">{{ m.oppScore }}</span>
                    <span class="match-diff" [class.pos]="m.result === 'W'" [class.neg]="m.result === 'L'">{{ m.result === 'W' ? '+' : '' }}{{ m.diff }}</span>
                  </div>
                  <span class="match-mvp">MVP {{ m.mvp }}</span>
                  <span class="match-date">{{ m.date }}</span>
                </div>
              }
            </div>
          </div>

          <div class="side-col">
            <div class="side-card">
              <div class="section-header">Trophies</div>
              @if (trophies.length > 0) {
                <div class="trophy-list">
                  @for (t of trophies; track t.name) {
                    <div class="trophy-item" [class]="'trophy-' + t.tier">
                      <span class="trophy-icon">{{ t.icon }}</span>
                      <div class="trophy-info">
                        <span class="trophy-name">{{ t.name }}</span>
                        <span class="trophy-sub">{{ t.detail }}</span>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="trophy-empty">
                  <mat-icon>emoji_events</mat-icon>
                  <span>No trophies yet</span>
                  <span class="trophy-sub">Season 1 in progress</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { background: #0a0a0f; min-height: 100%; }
    .loading { display: flex; justify-content: center; padding: 100px 0; }

    /* ── Hero ── */
    .hero {
      --tc: #7C3AED;
      position: relative; overflow: hidden; padding: 0;
    }
    .hero-wash {
      position: absolute; inset: 0;
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--tc) 20%, transparent) 0%, color-mix(in srgb, var(--tc) 8%, transparent) 50%, transparent 80%),
        radial-gradient(ellipse at 20% 80%, color-mix(in srgb, var(--tc) 10%, transparent), transparent 60%);
    }
    .hero-watermark {
      position: absolute; top: 50%; right: 24px; transform: translateY(-50%);
      font-family: 'Chakra Petch', sans-serif; font-size: 140px; font-weight: 800;
      color: white; opacity: 0.04; letter-spacing: 6px; line-height: 1; pointer-events: none;
    }
    .hero-content {
      position: relative; max-width: 1100px; margin: 0 auto; padding: 12px 32px 12px;
    }
    .hero-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .h2h-link {
      display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600;
      color: rgba(255,255,255,0.4); text-decoration: none; transition: color 0.15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: #A855F7; }
    }
    .back {
      display: inline-block;
      color: rgba(255,255,255,0.35); text-decoration: none; font-size: 13px; font-weight: 500;
      &:hover { color: white; }
    }
    .hero-split {
      display: flex; align-items: center; gap: 40px;
    }
    .hero-left { flex: 1; min-width: 0; }
    .hero-right {
      flex: 0 0 400px; position: relative;
    }
    .hero-video {
      position: relative; border-radius: 10px; overflow: hidden; aspect-ratio: 16 / 9;
      border: 2px solid color-mix(in srgb, var(--tc) 40%, transparent);
      box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 24px color-mix(in srgb, var(--tc) 15%, transparent);

      iframe {
        position: absolute; inset: 0; width: 100%; height: 100%; border: none; pointer-events: none;
      }
    }
    .video-overlay {
      position: absolute; inset: 0; z-index: 2; cursor: default;
    }
    .video-caption {
      text-align: center; margin: 10px 0 0; font-size: 13px; font-weight: 600;
      color: rgba(255,255,255,0.5);
    }
    .hero-diagonal {
      position: relative; height: 40px; margin-top: -1px;
      background: #0a0a0f;
      clip-path: polygon(0 100%, 100% 30%, 100% 100%);
    }
    .hero-left h1 {
      font-family: 'Chakra Petch', sans-serif; font-size: 42px; font-weight: 700;
      color: white; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 1px; line-height: 1;
    }
    .hero-meta {
      display: flex; align-items: center; gap: 8px; font-size: 14px; color: rgba(255,255,255,0.4);
      margin-bottom: 14px;
      .dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.2); }
    }

    /* Stat tiles */
    .stat-tiles { display: flex; align-items: stretch; gap: 12px; flex-wrap: wrap; }
    .stat-tile {
      padding: 14px 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; text-align: center; min-width: 80px;
    }
    .rank-tile {
      background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);
      .tile-val { font-size: 24px; }
    }
    .tile-val {
      display: block; font-family: 'Chakra Petch', sans-serif; font-size: 20px; font-weight: 700; color: white;
    }
    .tile-key { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.5px; }
    .win-color { color: #22c55e; }
    .loss-color { color: #ef4444; }

    .form-strip {
      display: flex; align-items: center; gap: 5px; padding: 14px 16px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;
    }
    .form-dot {
      width: 10px; height: 10px; border-radius: 50%;
      &.win { background: #22c55e; box-shadow: 0 0 4px rgba(34,197,94,0.4); }
      &.loss { background: #ef4444; box-shadow: 0 0 4px rgba(239,68,68,0.4); }
    }
    .streak-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.5); margin-left: 6px; }

    /* ── Roster (full width) ── */
    .roster-section {
      max-width: 1100px; margin: 0 auto; padding: 32px 32px 0;
    }

    .roster-cards {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px;
      margin-bottom: 32px;
    }
    .pc-slash {
      position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(135deg, transparent 40%, color-mix(in srgb, var(--tc) 12%, transparent) 40%);
      transition: opacity 0.3s; opacity: 0.7;
    }

    .player-card {
      position: relative; overflow: hidden;
      padding: 20px 16px; text-align: center;
      background: #12121e; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
      transition: all 0.25s;
      &:hover {
        border-color: color-mix(in srgb, var(--tc) 40%, transparent); transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        .pc-slash { opacity: 1; }
      }
      &.is-captain { border-color: color-mix(in srgb, var(--tc) 25%, transparent); }
      &.best-kd .pc-avatar { box-shadow: 0 0 14px rgba(234,179,8,0.3); border: 2px solid #eab308; }
    }

    /* ── Body (two column) ── */
    .body {
      max-width: 1100px; margin: 0 auto; padding: 0 32px 60px;
      display: grid; grid-template-columns: 1fr 280px; gap: 32px;
    }
    .main-col { min-width: 0; }
    .side-col { display: flex; flex-direction: column; gap: 20px; }

    .section-header {
      font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase;
      letter-spacing: 2px; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .pc-avatar {
      position: relative;
      width: 48px; height: 48px; border-radius: 12px; margin: 0 auto 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 700; color: white;
    }
    .pc-name {
      position: relative;
      font-size: 14px; font-weight: 600; color: white; margin-bottom: 12px;
      display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap;
    }
    .cpt-chip {
      font-size: 9px; font-weight: 700; color: #A855F7; padding: 1px 6px;
      background: rgba(124,58,237,0.1); border-radius: 3px; letter-spacing: 0.5px;
    }
    .mvp-chip {
      font-size: 9px; font-weight: 700; color: #eab308; padding: 1px 6px;
      background: rgba(234,179,8,0.1); border-radius: 3px; letter-spacing: 0.5px;
    }
    .pc-stats { position: relative; display: flex; justify-content: center; gap: 16px; }
    .pc-stat { text-align: center; }
    .pc-key { display: block; font-size: 9px; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .pc-val { display: block; font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.7); font-variant-numeric: tabular-nums; }
    .good { color: #22c55e !important; }
    .bad { color: #ef4444 !important; }

    /* ── Matches ── */
    .matches { display: flex; flex-direction: column; gap: 4px; }
    .opp-badge {
      padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800;
      color: white; letter-spacing: 0.5px; flex-shrink: 0;
    }
    .match-row {
      display: grid; grid-template-columns: 36px 24px 140px 1fr 120px auto; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 8px; transition: background 0.15s;
      &:hover { background: rgba(255,255,255,0.02); }
    }
    .match-chip {
      width: 32px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4);
      &.w { background: rgba(34,197,94,0.15); color: #22c55e; }
      &.l { background: rgba(239,68,68,0.15); color: #ef4444; }
    }
    .match-vs { font-size: 11px; color: rgba(255,255,255,0.15); }
    .match-opponent { font-size: 14px; font-weight: 600; color: white; }
    .match-score-wrap {
      display: flex; align-items: center; gap: 4px; font-variant-numeric: tabular-nums;
      justify-content: flex-end;
    }
    .match-score { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.4); }
    .win-score { color: white; }
    .match-dash { font-size: 12px; color: rgba(255,255,255,0.15); }
    .match-diff {
      font-size: 11px; font-weight: 700; margin-left: 6px; padding: 1px 6px; border-radius: 4px;
      &.pos { color: #22c55e; background: rgba(34,197,94,0.1); }
      &.neg { color: #ef4444; background: rgba(239,68,68,0.1); }
    }
    .match-mvp {
      font-size: 11px; color: rgba(234,179,8,0.6); font-weight: 600; white-space: nowrap;
      min-width: 100px;
    }
    .match-date { font-size: 12px; color: rgba(255,255,255,0.2); min-width: 50px; text-align: right; }

    /* ── Side Card ── */
    .side-card {
      padding: 20px; background: #12121e; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
    }
    .trophy-list { display: flex; flex-direction: column; gap: 8px; }
    .trophy-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 12px;
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px;
    }
    .trophy-icon { font-size: 24px; flex-shrink: 0; }
    .trophy-info { min-width: 0; }
    .trophy-name { display: block; font-size: 13px; font-weight: 600; color: white; }
    .trophy-item .trophy-sub { display: block; font-size: 11px; color: rgba(255,255,255,0.3); }
    .trophy-gold { border-color: rgba(234,179,8,0.2); background: rgba(234,179,8,0.04);
      .trophy-name { color: #eab308; }
    }
    .trophy-silver { border-color: rgba(148,163,184,0.2); background: rgba(148,163,184,0.04);
      .trophy-name { color: #94a3b8; }
    }
    .trophy-bronze { border-color: rgba(205,124,50,0.2); background: rgba(205,124,50,0.04);
      .trophy-name { color: #cd7c32; }
    }
    .trophy-purple { border-color: rgba(168,85,247,0.2); background: rgba(168,85,247,0.04);
      .trophy-name { color: #a855f7; }
    }

    .trophy-empty {
      text-align: center; padding: 20px 0;
      mat-icon { font-size: 32px; width: 32px; height: 32px; color: rgba(255,255,255,0.1); display: block; margin: 0 auto 8px; }
      span { display: block; font-size: 13px; color: rgba(255,255,255,0.3); }
      .trophy-sub { font-size: 11px; color: rgba(255,255,255,0.15); margin-top: 4px; }
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .body { grid-template-columns: 1fr; }
      .side-col { order: -1; }
      .roster-section { padding: 24px 16px 0; }
      .body { padding: 0 16px 40px; }
      .hero-content { padding: 20px 16px 24px; }
      .hero-split { flex-direction: column; gap: 24px; }
      .hero-right { flex: none; width: 100%; }
      .hero-left h1 { font-size: 28px; }
      .hero-watermark { font-size: 80px; }
      .stat-tiles { gap: 8px; }
      .stat-tile { min-width: 60px; padding: 10px 14px; }
      .roster-cards { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
      .match-row { grid-template-columns: 36px 24px 1fr auto; }
      .match-date, .match-mvp { display: none; }
      .tag-chip { width: 44px; height: 44px; font-size: 13px; }
    }
  `]
})
export class TeamDetailComponent implements OnInit {
  team: Team | null = null;
  loading = true;
  playerStats: PlayerStat[] = [];
  teamStats = { rank: 1, wins: 0, losses: 0, winPct: 0, avgKd: '0.00', form: [] as boolean[], streak: '' };
  recentMatches: { id: string; result: string; opponent: string; myScore: number; oppScore: number; diff: number; date: string; mvp: string }[] = [];
  trophies: { icon: string; name: string; detail: string; tier: string }[] = [];
  teamVideoUrl = '';
  teamVideoTitle = '';

  private teamVideos: Record<string, { id: string }> = {
    'Xm': { id: 'Pny_rPvdz4o' },
    'SkyzCentral': { id: 'Pny_rPvdz4o' },
  };

  constructor(private route: ActivatedRoute, private teamsService: TeamsService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.teamsService.getById(id).subscribe({
      next: (team) => { this.team = team; this.buildStats(team); this.loading = false; },
      error: () => { this.team = this.getDummyTeam(id); if (this.team) this.buildStats(this.team); this.loading = false; },
    });
  }

  private buildStats(team: Team): void {
    const vid = this.teamVideos[team.name] || { id: 'M5hCq5sAsgw' };
    this.teamVideoUrl = `https://www.youtube.com/embed/${vid.id}?autoplay=1&mute=1&loop=1&playlist=${vid.id}&controls=0&showinfo=0&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&playsinline=1`;
    this.teamVideoTitle = team.name + ' Montage';

    const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    this.playerStats = (team.memberships || []).map((m) => {
      const wins = rng(8, 35);
      const losses = rng(4, 20);
      const kd = +(0.7 + Math.random() * 1.1).toFixed(2);
      return { username: m.user?.username || '?', role: m.role, wins, losses, kd, winPct: Math.round((wins / (wins + losses)) * 100) };
    });

    // Tag best K/D
    if (this.playerStats.length) {
      const best = this.playerStats.reduce((a, b) => a.kd > b.kd ? a : b);
      best.bestKd = true;
    }

    const totalW = this.playerStats.reduce((s, p) => s + p.wins, 0);
    const totalL = this.playerStats.reduce((s, p) => s + p.losses, 0);
    const avgKd = this.playerStats.length ? (this.playerStats.reduce((s, p) => s + p.kd, 0) / this.playerStats.length).toFixed(2) : '0.00';

    // Generate matches first so form can derive from them
    const opponents = ['AiMz', 'dig', 'FeaR', 'Xm', 'Show', 'oB', 'SkyzCentral', 'hellRaisers'].filter(n => n !== team.name);
    this.recentMatches = Array.from({ length: 8 }, (_, i) => {
      const w = Math.random() > 0.4;
      const myScore = w ? rng(250, 300) : rng(150, 240);
      const oppScore = w ? rng(150, 240) : rng(250, 300);
      const playerNames = (team.memberships || []).map(m => m.user?.username || '?');
      return {
        id: `rm${i}`, result: w ? 'W' : 'L',
        opponent: opponents[rng(0, opponents.length - 1)],
        myScore, oppScore, diff: myScore - oppScore,
        date: `Jul ${rng(1, 13)}`,
        mvp: playerNames[rng(0, playerNames.length - 1)],
      };
    });

    // Derive form from last 5 matches
    const form = this.recentMatches.slice(0, 5).map(m => m.result === 'W');
    let streakCount = 1;
    for (let i = 1; i < this.recentMatches.length; i++) {
      if (this.recentMatches[i].result === this.recentMatches[0].result) streakCount++;
      else break;
    }

    this.teamStats = {
      rank: rng(1, 8),
      wins: totalW, losses: totalL,
      winPct: totalW + totalL > 0 ? Math.round((totalW / (totalW + totalL)) * 100) : 0,
      avgKd, form,
      streak: (this.recentMatches[0]?.result || 'W') + streakCount,
    };

    // Trophies per team
    const trophyMap: Record<string, { icon: string; name: string; detail: string; tier: string }[]> = {
      'AiMz': [
        { icon: '🏆', name: 'Season 1 Champions', detail: 'Black Ops 1 · July 2026', tier: 'gold' },
        { icon: '🥈', name: 'PSL Invitational', detail: '2nd Place · June 2026', tier: 'silver' },
      ],
      'dig': [
        { icon: '🏆', name: 'PSL Invitational', detail: '1st Place · June 2026', tier: 'gold' },
        { icon: '⚡', name: '10 Win Streak', detail: 'Achieved July 5, 2026', tier: 'purple' },
      ],
      'FeaR': [
        { icon: '🥉', name: 'Season 1 Playoffs', detail: '3rd Place · July 2026', tier: 'bronze' },
        { icon: '⚡', name: '5 Win Streak', detail: 'Achieved July 8, 2026', tier: 'purple' },
      ],
      'Xm': [
        { icon: '🥉', name: 'Midnight Tournament', detail: '3rd Place · July 2026', tier: 'bronze' },
      ],
      'Show': [
        { icon: '🏆', name: 'Midnight Tournament', detail: '1st Place · July 2026', tier: 'gold' },
        { icon: '🥈', name: 'Season 1 Playoffs', detail: '2nd Place · July 2026', tier: 'silver' },
        { icon: '⚡', name: '15 Win Streak', detail: 'Achieved July 10, 2026', tier: 'purple' },
      ],
      'oB': [
        { icon: '🥉', name: 'PSL Invitational', detail: '3rd Place · June 2026', tier: 'bronze' },
        { icon: '⚡', name: '7 Win Streak', detail: 'Achieved July 3, 2026', tier: 'purple' },
      ],
      'SkyzCentral': [
        { icon: '⚡', name: '8 Win Streak', detail: 'Achieved July 9, 2026', tier: 'purple' },
      ],
      'hellRaisers': [
        { icon: '🥈', name: 'Midnight Tournament', detail: '2nd Place · July 2026', tier: 'silver' },
        { icon: '⚡', name: '6 Win Streak', detail: 'Achieved July 7, 2026', tier: 'purple' },
      ],
    };
    this.trophies = trophyMap[team.name] || [];
  }

  private opponentMap: Record<string, { tag: string; color: string }> = {
    'AiMz': { tag: 'AIMZ', color: '#7C3AED' },
    'dig': { tag: 'DIG', color: '#DC2626' },
    'FeaR': { tag: 'FEAR', color: '#22c55e' },
    'Xm': { tag: 'XM', color: '#f59e0b' },
    'Show': { tag: 'SHOW', color: '#a855f7' },
    'oB': { tag: 'OB', color: '#ef4444' },
    'SkyzCentral': { tag: 'SC', color: '#3b82f6' },
    'hellRaisers': { tag: 'HR', color: '#64748b' },
  };

  getOpponentTag(name: string): string { return this.opponentMap[name]?.tag || name.substring(0, 3).toUpperCase(); }
  getOpponentColor(name: string): string { return this.opponentMap[name]?.color || '#555'; }

  private getDummyTeam(id: string): Team | null {
    const mk = (mid: string, uid: string, name: string, role: 'captain' | 'member' = 'member') =>
      ({ id: mid, userId: uid, role, joinedAt: '2026-07-01', user: { id: uid, username: name, discordId: uid } });
    const teams: Team[] = [
      { id: '1', name: 'AiMz', tag: 'AIMZ', game: 'Black Ops 1', region: 'NA', color: '#7C3AED', captainId: 'u1', captain: { id: 'u1', username: 'Rizon' }, createdAt: '2026-06-30', memberships: [mk('m1','u1','Rizon','captain'), mk('m2','u2','Accuracy'), mk('m3','u3','ClubyG'), mk('m4','u4','Dacoaco'), mk('m5','u5','Raxeo')] },
      { id: '2', name: 'dig', tag: 'DIG', game: 'Black Ops 1', region: 'NA', color: '#DC2626', captainId: 'u6', captain: { id: 'u6', username: 'Xen Soulmate' }, createdAt: '2026-06-30', memberships: [mk('m6','u6','Xen Soulmate','captain'), mk('m7','u7','GMBTx'), mk('m8','u8','imGMBYx'), mk('m9','u9','Xen Legacy'), mk('m10','u10','Xen YabbaDabba')] },
      { id: '3', name: 'FeaR', tag: 'FEAR', game: 'Black Ops 1', region: 'NA', color: '#22c55e', captainId: 'u11', captain: { id: 'u11', username: 'Bad Dad' }, createdAt: '2026-07-01', memberships: [mk('m11','u11','Bad Dad','captain'), mk('m12','u12','収量'), mk('m13','u13','Legend'), mk('m14','u14','Ninja'), mk('m15','u15','OG Eyres')] },
      { id: '4', name: 'Xm', tag: 'XM', game: 'Black Ops 1', region: 'NA', color: '#f59e0b', captainId: 'u16', captain: { id: 'u16', username: 'Convo Xm' }, createdAt: '2026-07-02', memberships: [mk('m16','u16','Convo Xm','captain'), mk('m17','u17','cL Junie'), mk('m18','u18','Accionar'), mk('m19','u19','Mr. Sweep')] },
      { id: '5', name: 'Show', tag: 'SHOW', game: 'Black Ops 1', region: 'NA', color: '#a855f7', captainId: 'u20', captain: { id: 'u20', username: 'Aqua' }, createdAt: '2026-07-05', memberships: [mk('m20','u20','Aqua','captain'), mk('m21','u21','Twizzy'), mk('m22','u22','Show Perfection'), mk('m23','u23','Slime'), mk('m24','u24','Tails')] },
      { id: '6', name: 'oB', tag: 'OB', game: 'Black Ops 1', region: 'NA', color: '#ef4444', captainId: 'u25', captain: { id: 'u25', username: 'VioLenT' }, createdAt: '2026-07-07', memberships: [mk('m25','u25','VioLenT','captain'), mk('m26','u26','ehxzo'), mk('m27','u27','Feedz'), mk('m28','u28','Lind'), mk('m29','u29','eMpoZe PunK')] },
      { id: '7', name: 'SkyzCentral', tag: 'SC', game: 'Black Ops 1', region: 'NA', color: '#3b82f6', captainId: 'u30', captain: { id: 'u30', username: 'Decree' }, createdAt: '2026-07-08', memberships: [mk('m30','u30','Decree','captain'), mk('m31','u31','lemmy'), mk('m32','u32','6fo'), mk('m33','u33','ghztly'), mk('m34','u34','ivy')] },
      { id: '8', name: 'hellRaisers', tag: 'HR', game: 'Black Ops 1', region: 'NA', color: '#64748b', captainId: 'u35', captain: { id: 'u35', username: 'drx' }, createdAt: '2026-07-08', memberships: [mk('m35','u35','drx','captain'), mk('m36','u36','S3l'), mk('m37','u37','4uH'), mk('m38','u38','Wubbie'), mk('m39','u39','BLASTA')] },
    ];
    return teams.find(t => t.id === id) || null;
  }
}
