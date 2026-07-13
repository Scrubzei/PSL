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
  mvp: string;
}

@Component({
  selector: 'app-head-to-head',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="page">
      <div class="container">
        <a routerLink="/teams" class="back">&larr; Teams</a>
        <h1>Head to Head</h1>

        <!-- Team Selectors -->
        <div class="selectors">
          <div class="selector">
            <label>Team 1</label>
            <select [(ngModel)]="team1Id" (change)="compute()">
              <option value="">Select team</option>
              @for (t of allTeams; track t.id) {
                <option [value]="t.id" [disabled]="t.id === team2Id">{{ t.name }}</option>
              }
            </select>
          </div>
          <div class="vs-badge">VS</div>
          <div class="selector">
            <label>Team 2</label>
            <select [(ngModel)]="team2Id" (change)="compute()">
              <option value="">Select team</option>
              @for (t of allTeams; track t.id) {
                <option [value]="t.id" [disabled]="t.id === team1Id">{{ t.name }}</option>
              }
            </select>
          </div>
        </div>

        @if (t1 && t2) {
          <!-- Comparison -->
          <div class="comparison">
            <!-- Team headers -->
            <div class="comp-header">
              <div class="comp-team left" [style.--tc]="t1.color || '#7C3AED'">
                <div class="comp-name">{{ t1.name }}</div>
                <div class="comp-tag">{{ t1.tag }}</div>
              </div>
              <div class="comp-record">
                <span class="cr-val" [class.leading]="h2hRecord.t1Wins > h2hRecord.t2Wins">{{ h2hRecord.t1Wins }}</span>
                <span class="cr-dash">-</span>
                <span class="cr-val" [class.leading]="h2hRecord.t2Wins > h2hRecord.t1Wins">{{ h2hRecord.t2Wins }}</span>
              </div>
              <div class="comp-team right" [style.--tc]="t2.color || '#7C3AED'">
                <div class="comp-name">{{ t2.name }}</div>
                <div class="comp-tag">{{ t2.tag }}</div>
              </div>
            </div>

            <!-- Stat bars -->
            <div class="stat-bars">
              @for (s of compStats; track s.label) {
                <div class="stat-bar-row">
                  <span class="sb-val left" [class.better]="s.val1 > s.val2">{{ s.display1 }}</span>
                  <div class="sb-center">
                    <div class="sb-track">
                      <div class="sb-fill left" [style.width.%]="s.pct1" [style.background]="t1.color || '#7C3AED'"></div>
                      <div class="sb-fill right" [style.width.%]="s.pct2" [style.background]="t2.color || '#DC2626'"></div>
                    </div>
                    <span class="sb-label">{{ s.label }}</span>
                  </div>
                  <span class="sb-val right" [class.better]="s.val2 > s.val1">{{ s.display2 }}</span>
                </div>
              }
            </div>

            <!-- H2H Match History -->
            <div class="h2h-history">
              <div class="section-header">Match History</div>
              @for (m of h2hMatches; track m.date) {
                <div class="h2h-row" [class.t1-win]="m.winner === t1!.name" [class.t2-win]="m.winner === t2!.name">
                  <span class="h2h-team" [class.winner]="m.winner === t1!.name">{{ t1!.tag }}</span>
                  <span class="h2h-score" [class.win-score]="m.winner === t1!.name">{{ m.score1 }}</span>
                  <span class="h2h-dash">-</span>
                  <span class="h2h-score" [class.win-score]="m.winner === t2!.name">{{ m.score2 }}</span>
                  <span class="h2h-team" [class.winner]="m.winner === t2!.name">{{ t2!.tag }}</span>
                  <span class="h2h-mvp">MVP {{ m.mvp }}</span>
                  <span class="h2h-date">{{ m.date }}</span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { background: #0a0a0f; min-height: 100%; }
    .container { max-width: 900px; margin: 0 auto; padding: 32px 24px 60px; }
    .back {
      display: inline-block; margin-bottom: 16px;
      color: rgba(255,255,255,0.35); text-decoration: none; font-size: 13px;
      &:hover { color: white; }
    }
    h1 {
      font-family: 'Chakra Petch', sans-serif; font-size: 32px; font-weight: 700;
      color: white; margin: 0 0 28px; text-transform: uppercase;
    }

    /* Selectors */
    .selectors { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 40px; }
    .selector {
      flex: 1;
      label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
      select {
        width: 100%; padding: 12px 16px; background: #12121e; border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px; color: white; font-size: 15px; font-weight: 600; font-family: inherit;
        appearance: none; cursor: pointer;
        &:focus { outline: none; border-color: rgba(124,58,237,0.4); }
        option { background: #12121e; }
      }
    }
    .vs-badge {
      font-family: 'Chakra Petch', sans-serif; font-size: 16px; font-weight: 700;
      color: rgba(255,255,255,0.15); padding-bottom: 12px;
    }

    /* Comparison */
    .comparison { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .comp-header {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      margin-bottom: 32px; padding: 24px; background: #12121e;
      border: 1px solid rgba(255,255,255,0.06); border-radius: 14px;
    }
    .comp-team { text-align: center; flex: 1; }
    .comp-team.right { text-align: center; }
    .comp-name { font-family: 'Chakra Petch', sans-serif; font-size: 24px; font-weight: 700; color: white; text-transform: uppercase; }
    .comp-tag { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.3); letter-spacing: 1px; margin-top: 2px; }
    .comp-record { text-align: center; flex-shrink: 0; }
    .cr-val {
      font-family: 'Chakra Petch', sans-serif; font-size: 36px; font-weight: 700; color: rgba(255,255,255,0.3);
      &.leading { color: white; }
    }
    .cr-dash { font-size: 24px; color: rgba(255,255,255,0.15); margin: 0 8px; }

    /* Stat Bars */
    .stat-bars { display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }
    .stat-bar-row { display: flex; align-items: center; gap: 12px; }
    .sb-val {
      width: 60px; font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.5);
      font-variant-numeric: tabular-nums;
      &.left { text-align: right; }
      &.right { text-align: left; }
      &.better { color: white; }
    }
    .sb-center { flex: 1; text-align: center; }
    .sb-track {
      display: flex; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.04); overflow: hidden;
      margin-bottom: 4px;
    }
    .sb-fill {
      height: 100%; transition: width 0.5s ease;
      &.left { border-radius: 3px 0 0 3px; }
      &.right { margin-left: auto; border-radius: 0 3px 3px 0; }
    }
    .sb-label { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 1px; }

    /* H2H History */
    .section-header {
      font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase;
      letter-spacing: 2px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .h2h-history { margin-top: 8px; }
    .h2h-row {
      display: grid; grid-template-columns: 60px auto 20px auto 60px 1fr auto; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 8px;
      &:hover { background: rgba(255,255,255,0.02); }
    }
    .h2h-team { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.4); text-align: center;
      &.winner { color: #22c55e; }
    }
    .h2h-score { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.35); text-align: center; font-variant-numeric: tabular-nums;
      &.win-score { color: white; }
    }
    .h2h-dash { font-size: 12px; color: rgba(255,255,255,0.15); text-align: center; }
    .h2h-mvp { font-size: 11px; color: rgba(234,179,8,0.6); font-weight: 600; text-align: right; }
    .h2h-date { font-size: 11px; color: rgba(255,255,255,0.2); text-align: right; }

    @media (max-width: 600px) {
      .selectors { flex-direction: column; align-items: stretch; }
      .vs-badge { text-align: center; padding: 0; }
      .comp-header { flex-direction: column; gap: 12px; }
      .comp-name { font-size: 20px; }
      .cr-val { font-size: 28px; }
      .h2h-row { grid-template-columns: 40px auto 16px auto 40px 1fr; }
      .h2h-date { display: none; }
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
        this.allTeams = teams.length ? teams : this.dummyTeams;
        const t1 = this.route.snapshot.queryParamMap.get('t1');
        const t2 = this.route.snapshot.queryParamMap.get('t2');
        if (t1) this.team1Id = t1;
        if (t2) this.team2Id = t2;
        if (this.team1Id && this.team2Id) this.compute();
      },
      error: () => { this.allTeams = this.dummyTeams; },
    });
  }

  compute(): void {
    this.t1 = this.allTeams.find(t => t.id === this.team1Id) || null;
    this.t2 = this.allTeams.find(t => t.id === this.team2Id) || null;
    if (!this.t1 || !this.t2) return;

    const rng = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const seed = (this.t1.id + this.t2.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    // Seeded stats
    const s = (base: number, offset: number) => base + ((seed + offset) % 20);
    const t1w = s(12, 1); const t1l = s(5, 2);
    const t2w = s(10, 3); const t2l = s(6, 4);
    const t1kd = +((0.8 + ((seed % 50) / 50)).toFixed(2));
    const t2kd = +((0.8 + (((seed + 7) % 50) / 50)).toFixed(2));
    const t1wp = Math.round((t1w / (t1w + t1l)) * 100);
    const t2wp = Math.round((t2w / (t2w + t2l)) * 100);

    this.compStats = [
      this.makeStat('Wins', t1w, t2w),
      this.makeStat('Losses', t1l, t2l, true),
      this.makeStat('Win Rate', t1wp, t2wp, false, '%'),
      this.makeStat('Avg K/D', t1kd, t2kd),
      this.makeStat('Avg Score', s(240, 5), s(235, 6)),
    ];

    // H2H record
    const totalH2H = 3 + (seed % 4);
    const t1Wins = Math.min(totalH2H, 1 + (seed % totalH2H));
    this.h2hRecord = { t1Wins, t2Wins: totalH2H - t1Wins };

    // H2H matches
    const allPlayers = [...(this.t1.memberships || []).map(m => m.user?.username || '?'), ...(this.t2.memberships || []).map(m => m.user?.username || '?')];
    this.h2hMatches = Array.from({ length: totalH2H }, (_, i) => {
      const t1Win = i < t1Wins;
      return {
        date: `Jul ${rng(1, 12)}`,
        winner: t1Win ? this.t1!.name : this.t2!.name,
        score1: t1Win ? rng(250, 300) : rng(150, 240),
        score2: t1Win ? rng(150, 240) : rng(250, 300),
        mvp: allPlayers[rng(0, allPlayers.length - 1)],
      };
    });
  }

  private makeStat(label: string, v1: number, v2: number, lowerBetter = false, suffix = ''): any {
    const total = v1 + v2 || 1;
    return {
      label, val1: v1, val2: v2,
      display1: v1 + suffix, display2: v2 + suffix,
      pct1: (v1 / total) * 100, pct2: (v2 / total) * 100,
    };
  }

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
}
