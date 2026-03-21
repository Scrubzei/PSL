import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GamesService, GameMap } from '../games/games.service';
import { MatchfinderService } from './matchfinder.service';

@Component({
  selector: 'app-create-match',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-wrapper">
      <div class="create-container">
        <a [routerLink]="['/matchfinder', game, platform]" class="back-link">&larr; Back</a>
        <h1>Create Match</h1>

        <!-- Best Of -->
        <section>
          <h2>Best Of</h2>
          <div class="option-grid">
            @for (option of bestOfOptions; track option) {
              <button
                class="option-card"
                [class.selected]="selectedBestOf === option"
                (click)="setBestOf(option)">
                <span class="option-value">{{ option }}</span>
                <span class="option-label">{{ option === 1 ? 'Game' : 'Games' }}</span>
              </button>
            }
          </div>
        </section>

        <!-- Map Slots -->
        <section>
          <h2>Maps</h2>
          <div class="map-slots">
            <div class="map-slot" *ngFor="let slot of selectedMaps; let i = index">
              <div class="slot-header">
                <span class="slot-label">Game {{ i + 1 }}</span>
                <span class="host-badge" [class.you]="getHostType(i) === 'you'" [class.them]="getHostType(i) === 'them'" [class.tbd]="getHostType(i) === 'tbd'">
                  {{ getHostLabel(i) }}
                </span>
              </div>
              <div class="slot-picker">
                <button *ngIf="slot" class="slot-selected" (click)="clearSlot(i)">
                  {{ slot.mapName }}
                  <i class="fa-solid fa-xmark"></i>
                </button>
                <div *ngIf="!slot" class="slot-options">
                  <button *ngFor="let map of gameMaps" class="map-option" (click)="pickMap(i, map)">
                    {{ map.mapName }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Submit -->
        <button
          class="submit-btn"
          [disabled]="!allMapsPicked || submitting"
          (click)="submit()">
          Find Opponent
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      background: #0a0a0f;
      min-height: 100%;
    }

    .create-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 48px 24px;
    }

    .back-link {
      color: rgba(255, 255, 255, 0.5);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: color 0.2s ease;

      &:hover {
        color: white;
      }
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      color: white;
      margin: 16px 0 40px;
    }

    section {
      margin-bottom: 40px;
    }

    h2 {
      font-size: 16px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.8);
      margin: 0 0 16px;
    }

    .option-grid {
      display: flex;
      gap: 10px;
    }

    .option-card {
      flex: 1;
      padding: 20px 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;

      .option-value {
        font-size: 24px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.6);
      }

      .option-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.3);
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      &:hover {
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.05);
      }

      &.selected {
        background: rgba(37, 99, 235, 0.15);
        border-color: #2563EB;

        .option-value {
          color: white;
        }

        .option-label {
          color: rgba(255, 255, 255, 0.5);
        }
      }
    }

    .map-slots {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .map-slot {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
    }

    .slot-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .slot-label {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.35);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .host-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: 0.5px;

      &.you {
        background: rgba(34, 197, 94, 0.15);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }

      &.them {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      &.tbd {
        background: rgba(250, 204, 21, 0.1);
        color: #fbbf24;
        border: 1px solid rgba(250, 204, 21, 0.25);
      }
    }

    .slot-selected {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 12px 16px;
      background: rgba(37, 99, 235, 0.15);
      border: 1px solid #2563EB;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;

      i {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
      }

      &:hover {
        background: rgba(37, 99, 235, 0.25);

        i {
          color: white;
        }
      }
    }

    .slot-options {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .map-option {
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.08);
        color: white;
      }
    }

    .submit-btn {
      width: 100%;
      padding: 16px;
      background: #2563EB;
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 16px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: #1d4ed8;
        box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    @media (max-width: 480px) {
      .create-container {
        padding: 32px 16px;
      }

      h1 {
        font-size: 24px;
      }
    }
  `]
})
export class CreateMatchComponent implements OnInit {
  game = '';
  platform = '';
  selectedBestOf = 1;
  selectedMaps: (GameMap | null)[] = [null];
  bestOfOptions = [1, 3, 5];
  gameMaps: GameMap[] = [];

  submitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gamesService: GamesService,
    private matchfinderService: MatchfinderService,
  ) {}

  ngOnInit(): void {
    this.game = this.route.snapshot.paramMap.get('game') || '';
    this.platform = this.route.snapshot.paramMap.get('platform') || '';
    this.gamesService.getMapsByGame(this.game).subscribe(maps => {
      this.gameMaps = maps;
    });
  }

  getHostType(index: number): 'you' | 'them' | 'tbd' {
    if (this.selectedBestOf === 1) return 'tbd';
    if (index === this.selectedBestOf - 1) return 'tbd';
    return index % 2 === 0 ? 'you' : 'them';
  }

  getHostLabel(index: number): string {
    if (this.selectedBestOf === 1) return 'Higher XP hosts';
    if (index === this.selectedBestOf - 1) return 'Higher XP hosts';
    return index % 2 === 0 ? 'You host' : 'They host';
  }

  get allMapsPicked(): boolean {
    return this.selectedMaps.length === this.selectedBestOf && this.selectedMaps.every(m => m !== null);
  }

  setBestOf(option: number): void {
    this.selectedBestOf = option;
    this.selectedMaps = Array(option).fill(null);
  }

  pickMap(slotIndex: number, map: GameMap): void {
    this.selectedMaps = this.selectedMaps.map((m, i) => i === slotIndex ? map : m);
  }

  clearSlot(slotIndex: number): void {
    this.selectedMaps = this.selectedMaps.map((m, i) => i === slotIndex ? null : m);
  }

  submit(): void {
    if (this.submitting) return;
    this.submitting = true;

    const mapNames = this.selectedMaps.map(m => m!.mapName);
    this.matchfinderService.createListing({
      game: this.game,
      platform: this.platform,
      bestOf: this.selectedBestOf,
      selectedMaps: mapNames,
    }).subscribe({
      next: () => {
        this.router.navigate(['/matchfinder', this.game, this.platform]);
      },
      error: (err) => {
        this.submitting = false;
        console.error('Failed to create listing:', err);
        alert(err.error?.message || 'Failed to create match listing');
      }
    });
  }
}
