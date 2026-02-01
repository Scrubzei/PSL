import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TournamentsService, TournamentMatch, BracketResponse } from './tournaments.service';
import { AuthService } from '../auth/auth.service';
import { ReportResultDialogComponent } from './report-result-dialog.component';

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
    MatDialogModule
  ],
  template: `
    <div class="bracket-container">
      @if (loading) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading bracket...</p>
        </div>
      } @else if (bracketData) {
        <div class="header">
          <div class="title-section">
            <button mat-icon-button [routerLink]="['/tournaments', bracketData.tournament.id]">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1>{{ bracketData.tournament.name }}</h1>
              <p class="subtitle">{{ bracketData.tournament.game.name }} - {{ bracketData.tournament.platform.name }}</p>
            </div>
          </div>
        </div>

        <div class="bracket-wrapper">
          <div class="bracket">
            @for (round of rounds; track round.roundNumber) {
              <div class="round">
                <div class="round-header">{{ round.roundName }}</div>
                <div class="matches">
                  @for (match of round.matches; track match.id) {
                    <div class="match" [class.ready]="match.status === 'READY'" [class.completed]="match.status === 'COMPLETED'">
                      <div class="player"
                           [class.winner]="match.winner?.id === match.player1?.id"
                           [class.loser]="match.status === 'COMPLETED' && match.winner?.id !== match.player1?.id && match.player1">
                        @if (match.player1) {
                          {{ match.player1.username }}
                        } @else {
                          <span class="tbd">TBD</span>
                        }
                      </div>
                      <div class="vs">VS</div>
                      <div class="player"
                           [class.winner]="match.winner?.id === match.player2?.id"
                           [class.loser]="match.status === 'COMPLETED' && match.winner?.id !== match.player2?.id && match.player2">
                        @if (match.player2) {
                          {{ match.player2.username }}
                        } @else {
                          <span class="tbd">TBD</span>
                        }
                      </div>
                      @if (canReportResult && match.status === 'READY') {
                        <button mat-stroked-button class="report-btn" (click)="openReportDialog(match)">
                          Report Result
                        </button>
                      }
                      @if (match.status === 'COMPLETED' && match.winner) {
                        <div class="winner-label">
                          <mat-icon>emoji_events</mat-icon>
                          {{ match.winner.username }}
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        @if (bracketData.tournament.status === 'COMPLETED') {
          <div class="champion-banner">
            <mat-icon>emoji_events</mat-icon>
            <span>Champion: {{ getChampion()?.username || 'TBD' }}</span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .bracket-container {
      padding: 24px;
      max-width: 100%;
      margin: 0 auto;
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

    .header {
      margin-bottom: 24px;

      .title-section {
        display: flex;
        align-items: center;
        gap: 8px;

        h1 {
          margin: 0;
          color: white;
        }

        .subtitle {
          margin: 4px 0 0;
          color: var(--theme-primary-bright, #64b5f6);
        }
      }
    }

    .bracket-wrapper {
      overflow-x: auto;
      padding: 16px 0;
    }

    .bracket {
      display: flex;
      gap: 48px;
      min-width: fit-content;
    }

    .round {
      display: flex;
      flex-direction: column;
      min-width: 220px;

      .round-header {
        text-align: center;
        padding: 8px;
        margin-bottom: 16px;
        background: rgba(100, 181, 246, 0.1);
        border-radius: 4px;
        color: var(--theme-primary-bright, #64b5f6);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 12px;
      }
    }

    .matches {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      flex: 1;
      gap: 16px;
    }

    .match {
      background: #1e1e1e;
      border: 1px solid #2d2d2d;
      border-radius: 8px;
      padding: 12px;
      transition: border-color 0.2s;

      &.ready {
        border-color: #4caf50;
      }

      &.completed {
        border-color: #607d8b;
      }
    }

    .player {
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      text-align: center;
      transition: background 0.2s;

      &.winner {
        background: rgba(76, 175, 80, 0.2);
        color: #81c784;
        font-weight: 500;
      }

      &.loser {
        opacity: 0.5;
        text-decoration: line-through;
      }

      .tbd {
        color: rgba(255, 255, 255, 0.3);
        font-style: italic;
      }
    }

    .vs {
      text-align: center;
      padding: 4px;
      color: rgba(255, 255, 255, 0.3);
      font-size: 10px;
    }

    .report-btn {
      width: 100%;
      margin-top: 8px;
      font-size: 12px;
    }

    .winner-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-top: 8px;
      padding: 4px;
      color: #ffd700;
      font-size: 12px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .champion-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 32px;
      padding: 24px;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 193, 7, 0.05));
      border: 2px solid #ffd700;
      border-radius: 12px;
      color: #ffd700;
      font-size: 24px;
      font-weight: 500;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }
    }
  `]
})
export class TournamentBracketComponent implements OnInit {
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
  ) {}

  get canReportResult(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'admin' || role === 'ref';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBracket(id);
    }
  }

  loadBracket(id: string): void {
    this.loading = true;
    this.tournamentsService.getBracket(id).subscribe({
      next: (data) => {
        this.bracketData = data;
        this.organizeBracket(data.matches);
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
    // Group matches by round
    const roundMap = new Map<number, TournamentMatch[]>();

    for (const match of matches) {
      if (!roundMap.has(match.round)) {
        roundMap.set(match.round, []);
      }
      roundMap.get(match.round)!.push(match);
    }

    // Sort rounds (highest first = first round, 1 = finals)
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
    if (round === 1) return 'Finals';
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
