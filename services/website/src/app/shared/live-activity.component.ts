import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, timer, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { UsersService, GlobalRecentWin } from '../users/users.service';

/**
 * Global "Live Activity" ticker. Mounted once in the app shell (under the navbar)
 * so it renders on every page. Pulls live match results from the backend
 * (NeatQueue-backed) and refreshes on an interval. Uses the same card styling as
 * the landing-page ticker.
 */
@Component({
  selector: 'app-live-activity',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (wins.length > 0) {
      <div class="ticker">
        <div class="ticker-fade-left"></div>
        <div class="ticker-fade-right"></div>
        <div class="ticker-inner">
          @for (m of wins; track m.matchId) {
            <div class="ticker-card">
              <div class="tc-badge" [class.live]="m.status === 'LIVE'">
                <span class="tc-badge-status">{{ m.status }}</span>
                <span class="tc-badge-game">{{ m.game }}</span>
              </div>
              <div class="tc-body">
                <div class="tc-side" [class.won]="m.winner === m.team1" [class.lost]="!!m.winner && m.winner !== m.team1">
                  <span class="tc-captain">{{ m.team1 }}</span>
                  <span class="tc-roster">{{ m.players1.join(' · ') }}</span>
                </div>
                <div class="tc-divider"><span>VS</span></div>
                <div class="tc-side" [class.won]="m.winner === m.team2" [class.lost]="!!m.winner && m.winner !== m.team2">
                  <span class="tc-captain">{{ m.team2 }}</span>
                  <span class="tc-roster">{{ m.players2.join(' · ') }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    /* Frame: fixed positioning context that clips + holds the edge fades. */
    .ticker {
      background: #0a0a0f;
      position: relative;
      overflow: hidden;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .ticker-fade-left, .ticker-fade-right {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 80px;
      z-index: 2;
      pointer-events: none;
    }

    .ticker-fade-left {
      left: 0;
      background: linear-gradient(to right, #0a0a0f 0%, transparent 100%);
    }

    .ticker-fade-right {
      right: 0;
      background: linear-gradient(to left, #0a0a0f 0%, transparent 100%);
    }

    /* Scroller: the horizontally scrolling row of cards. */
    .ticker-inner {
      display: flex;
      gap: 12px;
      padding: 16px 20px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      &::-webkit-scrollbar { display: none; }
    }

    .ticker-card {
      background: linear-gradient(135deg, #1e1e2c 0%, #251b37 100%);
      border: 1px solid rgba(168, 85, 247, 0.22);
      border-radius: 10px;
      min-width: 280px;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;

      &:hover {
        border-color: rgba(168, 85, 247, 0.45);
        box-shadow: 0 6px 22px rgba(124, 58, 237, 0.18);
        transform: translateY(-1px);
      }
    }

    .tc-badge {
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(124, 58, 237, 0.08);

      &.live .tc-badge-status {
        color: #ef4444;
        text-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
      }

      &.live {
        background: linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, transparent 100%);
        border-bottom-color: rgba(239, 68, 68, 0.1);
      }
    }

    .tc-badge-status {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #A855F7;
    }

    .tc-badge-game {
      font-size: 12px;
      font-weight: 600;
      color: rgba(190, 130, 255, 0.75);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tc-body {
      display: flex;
      align-items: stretch;
      padding: 12px 16px;
      gap: 0;
    }

    .tc-side {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;

      &.won .tc-captain { color: #22c55e; }
      &.won .tc-roster { color: rgba(34, 197, 94, 0.35); }
      &.lost .tc-captain { color: rgba(255, 255, 255, 0.25); }
      &.lost .tc-roster { color: rgba(255, 255, 255, 0.18); }
    }

    .tc-captain {
      font-size: 15px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.85);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tc-roster {
      font-size: 11px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tc-divider {
      display: flex;
      align-items: center;
      padding: 0 14px;
      flex-shrink: 0;

      span {
        font-size: 10px;
        font-weight: 700;
        color: rgba(124, 58, 237, 0.3);
        letter-spacing: 1px;
      }
    }
  `],
})
export class LiveActivityComponent implements OnInit, OnDestroy {
  wins: GlobalRecentWin[] = [];
  private sub?: Subscription;

  /** How often to refresh the feed. */
  private static readonly REFRESH_MS = 30_000;

  constructor(private usersService: UsersService) {}

  ngOnInit(): void {
    this.sub = timer(0, LiveActivityComponent.REFRESH_MS)
      .pipe(
        switchMap(() =>
          this.usersService
            .getGlobalRecentWins(15)
            .pipe(catchError(() => of([] as GlobalRecentWin[]))),
        ),
      )
      .subscribe(wins => (this.wins = wins));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
