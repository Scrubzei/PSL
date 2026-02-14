import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ThemeService, Platform } from '../shared/theme.service';

interface GameLeaderboard {
  game: string;
  platform: string;
  image?: string;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss']
})
export class LeaderboardComponent implements OnInit {
  platforms: Platform[] = ['Plutonium', 'IW4X', 'Xbox', 'PS3'];
  selectedPlatform: Platform = 'Plutonium';
  hoveredGame: string | null = null;

  // Game availability per platform
  private gamesByPlatform: Record<string, string[]> = {
    'Plutonium': ['Bo2', 'Mw3', 'Bo1'],
    'IW4X': ['Mw2'],
    'Xbox': ['Bo2', 'Mw3', 'Mw2', 'Bo1'],
    'PS3': ['Bo2', 'Mw3', 'Mw2', 'Bo1']
  };

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Restore saved platform from theme service
    this.selectedPlatform = this.themeService.currentPlatform();
  }

  onPlatformChange(platform: Platform): void {
    this.selectedPlatform = platform;
    this.themeService.setPlatform(platform);
  }

  get leaderboards(): GameLeaderboard[] {
    const games = this.gamesByPlatform[this.selectedPlatform] || [];
    return games.map(game => ({
      game,
      platform: this.selectedPlatform,
      image: `assets/games/${game.toLowerCase()}.webp`
    }));
  }

  onGameHover(game: string | null): void {
    this.hoveredGame = game;
  }

  get backgroundImage(): string | null {
    if (this.hoveredGame) {
      return `assets/games/${this.hoveredGame.toLowerCase()}.webp`;
    }
    return null;
  }

  openLeaderboard(leaderboard: GameLeaderboard): void {
    // Navigate to specific leaderboard detail page
    this.router.navigate(['/leaderboards', leaderboard.game.toLowerCase(), leaderboard.platform.toLowerCase()]);
  }
}
