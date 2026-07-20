import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TeamsService, Team } from './teams.service';

interface H2HMatch {
  date: string;
  winner: string;
  score1: number;
  score2: number;
  diff: number;
  mvp: string;
  t1Result: 'W' | 'L';
}

@Component({
  selector: 'app-head-to-head',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="page">
      <div class="container">
        <a routerLink="/teams" class="back">&larr; Teams</a>

        <!-- Team Selectors -->
        <div class="selectors">
          <div class="selector">
            <select [(ngModel)]="team1Id" (change)="compute()">
              <option value="">Select team</option>
              @for (t of allTeams; track t.id) {
                <option [value]="t.id" [disabled]="t.id === team2Id">{{ t.name }}</option>
              }
            </select>
          </div>
          <span class="sel-vs">VS</span>
          <div class="selector">
            <select [(ngModel)]="team2Id" (change)="compute()">
              <option value="">Select team</option>
              @for (t of allTeams; track t.id) {
                <option [value]="t.id" [disabled]="t.id === team1Id">{{ t.name }}</option>
              }
            </select>
          </div>
        </div>

        @if (t1 && t2) {
          <!-- VS Hero -->
          <div class="vs-hero" [style.--c1]="t1.color || '#7C3AED'" [style.--c2]="t2.color || '#DC2626'">
            <div class="vs-wedge left"></div>
            <div class="vs-wedge right"></div>
            <div class="vs-seam"></div>
            <div class="vs-content">
              <div class="vs-side left">
                <span class="vs-name">{{ t1.name }}</span>
              </div>
              <div class="vs-record">
                <span class="vs-num" [class.leading]="h2hRecord.t1Wins > h2hRecord.t2Wins" [style.color]="h2hRecord.t1Wins > h2hRecord.t2Wins ? t1.color : ''">{{ h2hRecord.t1Wins }}</span>
                <span class="vs-dash">–</span>
                <span class="vs-num" [class.leading]="h2hRecord.t2Wins > h2hRecord.t1Wins" [style.color]="h2hRecord.t2Wins > h2hRecord.t1Wins ? t2.color : ''">{{ h2hRecord.t2Wins }}</span>
              </div>
              <div class="vs-side right">
                <span class="vs-name">{{ t2.name }}</span>
              </div>
            </div>
          </div>

          <!-- Stat Bars -->
          <div class="stat-bars">
            @for (s of compStats; track s.label) {
              <div class="bar-row">
                <span class="bar-val left" [class.better]="s.val1 > s.val2" [style.color]="s.val1 >= s.val2 ? t1.color : ''">{{ s.display1 }}</span>
                <div class="bar-center">
                  <div class="bar-track">
                    <div class="bar-fill left" [style.width.%]="s.pct1" [style.background]="t1.color || '#7C3AED'"></div>
                    <div class="bar-fill right" [style.width.%]="s.pct2" [style.background]="t2.color || '#DC2626'"></div>
                  </div>
                  <span class="bar-label">{{ s.label }}</span>
                </div>
                <span class="bar-val right" [class.better]="s.val2 > s.val1" [style.color]="s.val2 >= s.val1 ? t2.color : ''">{{ s.display2 }}</span>
              </div>
            }
          </div>

          <!-- Match History -->
          <div class="history">
            <div class="section-header">Match History</div>
            @for (m of h2hMatches; track m.date + m.score1) {
              <div class="h-row">
                <span class="h-chip" [class.w]="m.t1Result === 'W'" [class.l]="m.t1Result === 'L'">{{ m.t1Result }}</span>
                <span class="h-team" [style.color]="m.t1Result === 'W' ? t1.color : ''">{{ t1.tag }}</span>
                <div class="h-score-wrap">
                  <span class="h-score" [class.win-s]="m.t1Result === 'W'">{{ m.score1 }}</span>
                  <span class="h-dash">-</span>
                  <span class="h-score" [class.win-s]="m.t1Result === 'L'">{{ m.score2 }}</span>
                  <span class="h-diff" [class.pos]="m.t1Result === 'W'" [class.neg]="m.t1Result === 'L'">{{ m.t1Result === 'W' ? '+' : '' }}{{ m.diff }}</span>
                </div>
                <span class="h-team right" [style.color]="m.t1Result === 'L' ? t2.color : ''">{{ t2.tag }}</span>
                <span class="h-mvp">MVP {{ m.mvp }}</span>
                <span class="h-date">{{ m.date }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { background: #0a0a0f; min-height: 100%; }
    .container { max-width: 960px; margin: 0 auto; padding: 28px 24px 60px; }
    .back {
      display: inline-block; margin-bottom: 20px;
      color: rgba(255,255,255,0.35); text-decoration: none; font-size: 13px;
      &:hover { color: white; }
    }

    /* Selectors */
    .selectors { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
    .selector {
      flex: 1;
      select {
        width: 100%; padding: 14px 18px; background: #12121e; border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px; color: white; font-size: 16px; font-weight: 700; font-family: 'Chakra Petch', sans-serif;
        text-transform: uppercase; letter-spacing: 0.5px; appearance: none; cursor: pointer;
        &:focus { outline: none; border-color: rgba(124,58,237,0.4); }
        option { background: #12121e; text-transform: none; font-family: inherit; }
      }
    }
    .sel-vs {
      font-family: 'Chakra Petch', sans-serif; font-size: 14px; font-weight: 700;
      color: rgba(255,255,255,0.15); letter-spacing: 2px; flex-shrink: 0;
    }

    /* VS Hero */
    .vs-hero {
      --c1: #7C3AED; --c2: #DC2626;
      position: relative; height: 180px; border-radius: 14px; overflow: hidden;
      margin-bottom: 28px; animation: fadeUp 0.4s ease;
    }
    .vs-wedge {
      position: absolute; top: 0; bottom: 0; width: 55%;
      &.left {
        left: 0;
        background: linear-gradient(135deg, color-mix(in srgb, var(--c1) 18%, #12121e) 0%, #12121e 80%);
        clip-path: polygon(0 0, 100% 0, 75% 100%, 0 100%);
      }
      &.right {
        right: 0;
        background: linear-gradient(225deg, color-mix(in srgb, var(--c2) 18%, #12121e) 0%, #12121e 80%);
        clip-path: polygon(25% 0, 100% 0, 100% 100%, 0 100%);
      }
    }
    .vs-seam {
      position: absolute; top: 0; bottom: 0; left: 50%; width: 3px; transform: translateX(-50%) skewX(-20deg);
      background: linear-gradient(180deg, color-mix(in srgb, var(--c1) 60%, white), rgba(255,255,255,0.1), color-mix(in srgb, var(--c2) 60%, white));
      box-shadow: 0 0 16px rgba(255,255,255,0.15);
      animation: seamPulse 3s ease-in-out infinite;
    }
    @keyframes seamPulse {
      0%, 100% { box-shadow: 0 0 16px rgba(255,255,255,0.1); }
      50% { box-shadow: 0 0 24px rgba(255,255,255,0.25); }
    }
    .vs-content {
      position: relative; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 1;
    }
    .vs-side {
      flex: 1; display: flex; align-items: center; padding: 0 32px;
      &.left { justify-content: flex-start; }
      &.right { justify-content: flex-end; }
    }
    .vs-name {
      font-family: 'Chakra Petch', sans-serif; font-size: 32px; font-weight: 700;
      color: white; text-transform: uppercase; letter-spacing: 1px;
    }
    .vs-record {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0; padding: 0 20px;
    }
    .vs-num {
      font-family: 'Chakra Petch', sans-serif; font-size: 48px; font-weight: 800;
      color: rgba(255,255,255,0.25); line-height: 1;
      &.leading { color: white; }
    }
    .vs-dash { font-size: 28px; color: rgba(255,255,255,0.12); }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Stat Bars */
    .stat-bars { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; animation: fadeUp 0.5s ease 0.1s both; }
    .bar-row { display: flex; align-items: center; gap: 14px; }
    .bar-val {
      width: 56px; font-family: 'Chakra Petch', sans-serif; font-size: 16px; font-weight: 700;
      color: rgba(255,255,255,0.35); font-variant-numeric: tabular-nums;
      &.left { text-align: right; }
      &.right { text-align: left; }
      &.better { color: white; }
    }
    .bar-center { flex: 1; text-align: center; }
    .bar-track {
      display: flex; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.04);
      overflow: hidden; margin-bottom: 4px;
    }
    .bar-fill {
      height: 100%; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      &.left { border-radius: 4px 0 0 4px; }
      &.right { margin-left: auto; border-radius: 0 4px 4px 0; }
    }
    .bar-label {
      font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 1.5px;
    }

    /* History */
    .history { animation: fadeUp 0.5s ease 0.2s both; }
    .section-header {
      font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.3); text-transform: uppercase;
      letter-spacing: 2px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .h-row {
      display: grid; grid-template-columns: 36px 56px 1fr 56px 120px auto; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 8px; transition: all 0.15s;
      &:hover { background: rgba(255,255,255,0.02); transform: translateY(-1px); }
    }
    .h-chip {
      width: 32px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4);
      &.w { background: rgba(34,197,94,0.15); color: #22c55e; }
      &.l { background: rgba(239,68,68,0.15); color: #ef4444; }
    }
    .h-team {
      font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.4); text-align: center;
      &.right { text-align: center; }
    }
    .h-score-wrap { display: flex; align-items: center; justify-content: center; gap: 4px; font-variant-numeric: tabular-nums; }
    .h-score { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.3);
      &.win-s { color: white; }
    }
    .h-dash { font-size: 12px; color: rgba(255,255,255,0.12); }
    .h-diff {
      font-size: 11px; font-weight: 700; margin-left: 6px; padding: 1px 6px; border-radius: 4px;
      &.pos { color: #22c55e; background: rgba(34,197,94,0.1); }
      &.neg { color: #ef4444; background: rgba(239,68,68,0.1); }
    }
    .h-mvp { font-size: 11px; color: rgba(234,179,8,0.6); font-weight: 600; text-align: right; }
    .h-date { font-size: 11px; color: rgba(255,255,255,0.2); text-align: right; min-width: 50px; }

    @media (max-width: 768px) {
      .selectors { flex-direction: column; gap: 8px; }
      .sel-vs { padding: 0; }
      .vs-hero { height: 140px; }
      .vs-name { font-size: 20px; }
      .vs-num { font-size: 36px; }
      .vs-side { padding: 0 16px; }
      .h-row { grid-template-columns: 36px 40px 1fr 40px auto; }
      .h-mvp, .h-date { display: none; }
    }

    @media (max-width: 480px) {
      .vs-hero { height: 200px; }
      .vs-content { flex-direction: column; gap: 8px; }
      .vs-side { justify-content: center !important; padding: 0; }
      .vs-wedge.left { clip-path: polygon(0 0, 100% 0, 100% 55%, 0 55%); width: 100%; }
      .vs-wedge.right { clip-path: polygon(0 45%, 100% 45%, 100% 100%, 0 100%); width: 100%; }
      .vs-seam { left: 0; right: 0; top: 50%; bottom: auto; width: 100%; height: 3px; transform: translateY(-50%) skewY(-3deg); }
    }
  `]
})
export class HeadToHeadComponent implements OnInit {
  allTeams: Team[] = [];
  team1Id = '';
  team2Id = '';
  t1: Team | null = null;
  t2: Team | null = null;
  h2hRecord = { t1Wins: 0, t2Wins: 0 };
  compStats: { label: string; val1: number; val2: number; display1: string; display2: string; pct1: number; pct2: number }[] = [];
  h2hMatches: H2HMatch[] = [];

  constructor(private teamsService: TeamsService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.teamsService.getAll().subscribe({
      next: (teams) => {
        this.allTeams = teams;
        const t1 = this.route.snapshot.queryParamMap.get('t1');
        const t2 = this.route.snapshot.queryParamMap.get('t2');
        if (t1) this.team1Id = t1;
        if (t2) this.team2Id = t2;
        if (this.team1Id && this.team2Id) this.compute();
      },
      error: () => { this.allTeams = []; },
    });
  }

  compute(): void {
    this.t1 = this.allTeams.find(t => t.id === this.team1Id) || null;
    this.t2 = this.allTeams.find(t => t.id === this.team2Id) || null;
    if (!this.t1 || !this.t2) return;

    const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const seed = (this.t1.id + this.t2.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const s = (base: number, offset: number) => base + ((seed + offset) % 20);

    const t1w = s(12, 1); const t1l = s(5, 2);
    const t2w = s(10, 3); const t2l = s(6, 4);
    const t1kd = +((0.8 + ((seed % 50) / 50)).toFixed(2));
    const t2kd = +((0.8 + (((seed + 7) % 50) / 50)).toFixed(2));
    const t1wp = Math.round((t1w / (t1w + t1l)) * 100);
    const t2wp = Math.round((t2w / (t2w + t2l)) * 100);

    this.compStats = [
      this.makeStat('Wins', t1w, t2w),
      this.makeStat('Losses', t1l, t2l),
      this.makeStat('Win Rate', t1wp, t2wp, '%'),
      this.makeStat('Avg K/D', t1kd, t2kd),
      this.makeStat('Avg Score', s(240, 5), s(235, 6)),
    ];

    const totalH2H = 3 + (seed % 5);
    const t1Wins = Math.min(totalH2H, 1 + (seed % totalH2H));
    this.h2hRecord = { t1Wins, t2Wins: totalH2H - t1Wins };

    const allPlayers = [...(this.t1.memberships || []).map(m => m.user?.username || '?'), ...(this.t2.memberships || []).map(m => m.user?.username || '?')];
    this.h2hMatches = Array.from({ length: totalH2H }, (_, i) => {
      const t1Win = i < t1Wins;
      const s1 = t1Win ? rng(250, 300) : rng(150, 240);
      const s2 = t1Win ? rng(150, 240) : rng(250, 300);
      return {
        date: `Jul ${rng(1, 12)}`,
        winner: t1Win ? this.t1!.name : this.t2!.name,
        score1: s1, score2: s2,
        diff: s1 - s2,
        mvp: allPlayers[rng(0, allPlayers.length - 1)],
        t1Result: (t1Win ? 'W' : 'L') as 'W' | 'L',
      };
    });
  }

  private makeStat(label: string, v1: number, v2: number, suffix = ''): any {
    const total = v1 + v2 || 1;
    return { label, val1: v1, val2: v2, display1: v1 + suffix, display2: v2 + suffix, pct1: (v1 / total) * 100, pct2: (v2 / total) * 100 };
  }

  /* Fake teams fallback data — removed (commented out).
  private mk = (id: string, uid: string, name: string, role: 'captain' | 'member' = 'member') =>
    ({ id, userId: uid, role, joinedAt: '2026-07-01', user: { id: uid, username: name, discordId: uid } });

  private dummyTeams: Team[] = [
    { id: '1', name: 'AiMz', tag: 'AIMZ', game: 'Black Ops 1', region: 'NA', color: '#7C3AED', captainId: 'u1', captain: { id: 'u1', username: 'Rizon' }, createdAt: '2026-06-30', memberships: [this.mk('m1','u1','Rizon','captain'), this.mk('m2','u2','Accuracy'), this.mk('m3','u3','ClubyG'), this.mk('m4','u4','Dacoaco'), this.mk('m5','u5','Raxeo')] },
    { id: '2', name: 'dig', tag: 'DIG', game: 'Black Ops 1', region: 'NA', color: '#DC2626', captainId: 'u6', captain: { id: 'u6', username: 'Xen Soulmate' }, createdAt: '2026-06-30', memberships: [this.mk('m6','u6','Xen Soulmate','captain'), this.mk('m7','u7','GMBTx'), this.mk('m8','u8','imGMBYx'), this.mk('m9','u9','Xen Legacy'), this.mk('m10','u10','Xen YabbaDabba')] },
    { id: '3', name: 'FeaR', tag: 'FEAR', game: 'Black Ops 1', region: 'NA', color: '#22c55e', captainId: 'u11', captain: { id: 'u11', username: 'Bad Dad' }, createdAt: '2026-07-01', memberships: [this.mk('m11','u11','Bad Dad','captain'), this.mk('m12','u12','収量'), this.mk('m13','u13','Legend'), this.mk('m14','u14','Ninja'), this.mk('m15','u15','OG Eyres')] },
    { id: '4', name: 'Xm', tag: 'XM', game: 'Black Ops 1', region: 'NA', color: '#f59e0b', captainId: 'u16', captain: { id: 'u16', username: 'Convo Xm' }, createdAt: '2026-07-02', memberships: [this.mk('m16','u16','Convo Xm','captain'), this.mk('m17','u17','cL Junie'), this.mk('m18','u18','Accionar'), this.mk('m19','u19','Mr. Sweep')] },
    { id: '5', name: 'Show', tag: 'SHOW', game: 'Black Ops 1', region: 'NA', color: '#a855f7', captainId: 'u20', captain: { id: 'u20', username: 'Aqua' }, createdAt: '2026-07-05', memberships: [this.mk('m20','u20','Aqua','captain'), this.mk('m21','u21','Twizzy'), this.mk('m22','u22','Show Perfection'), this.mk('m23','u23','Slime'), this.mk('m24','u24','Tails')] },
    { id: '6', name: 'oB', tag: 'OB', game: 'Black Ops 1', region: 'NA', color: '#ef4444', captainId: 'u25', captain: { id: 'u25', username: 'VioLenT' }, createdAt: '2026-07-07', memberships: [this.mk('m25','u25','VioLenT','captain'), this.mk('m26','u26','ehxzo'), this.mk('m27','u27','Feedz'), this.mk('m28','u28','Lind'), this.mk('m29','u29','eMpoZe PunK')] },
    { id: '7', name: 'SkyzCentral', tag: 'SC', game: 'Black Ops 1', region: 'NA', color: '#3b82f6', captainId: 'u30', captain: { id: 'u30', username: 'Decree' }, createdAt: '2026-07-08', memberships: [this.mk('m30','u30','Decree','captain'), this.mk('m31','u31','lemmy'), this.mk('m32','u32','6fo'), this.mk('m33','u33','ghztly'), this.mk('m34','u34','ivy')] },
    { id: '8', name: 'hellRaisers', tag: 'HR', game: 'Black Ops 1', region: 'NA', color: '#64748b', captainId: 'u35', captain: { id: 'u35', username: 'drx' }, createdAt: '2026-07-08', memberships: [this.mk('m35','u35','drx','captain'), this.mk('m36','u36','S3l'), this.mk('m37','u37','4uH'), this.mk('m38','u38','Wubbie'), this.mk('m39','u39','BLASTA')] },
  ];
  */
}
