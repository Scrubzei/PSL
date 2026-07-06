import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface GamePlatform {
  name: string;
  slug: string;
  color: string;
  hoverColor: string;
  icon: string;
}

interface Game {
  name: string;
  slug: string;
  image: string;
  platforms: GamePlatform[];
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss'],
  host: { style: 'display: block;' }
})
export class LeaderboardComponent {
  selectedGame: string | null = null;
  hoveredGame: string | null = null;
  hoveredImage: string | null = null;

  games: Game[] = [
    {
      name: 'Modern Warfare 2',
      slug: 'mw2',
      image: 'assets/games/mw2.webp',
      platforms: [
        { name: 'IW4X', slug: 'iw4x', color: '#991b1b', hoverColor: '#b91c1c', icon: 'fa-solid fa-desktop' },
        { name: 'Xbox', slug: 'xbox', color: '#14532d', hoverColor: '#166534', icon: 'fa-brands fa-xbox' },
        { name: 'PlayStation', slug: 'ps3', color: '#1e3a5f', hoverColor: '#1e4d8a', icon: 'fa-brands fa-playstation' }
      ]
    },
    {
      name: 'Black Ops 1',
      slug: 'bo1',
      image: 'assets/games/bo1.webp',
      platforms: [
        { name: 'Xbox', slug: 'xbox', color: '#14532d', hoverColor: '#166534', icon: 'fa-brands fa-xbox' },
        { name: 'PlayStation', slug: 'ps3', color: '#1e3a5f', hoverColor: '#1e4d8a', icon: 'fa-brands fa-playstation' }
      ]
    },
    {
      name: 'Modern Warfare 3',
      slug: 'mw3',
      image: 'assets/games/mw3.webp',
      platforms: [
        { name: 'Xbox', slug: 'xbox', color: '#14532d', hoverColor: '#166534', icon: 'fa-brands fa-xbox' },
        { name: 'PlayStation', slug: 'ps3', color: '#1e3a5f', hoverColor: '#1e4d8a', icon: 'fa-brands fa-playstation' }
      ]
    },
    {
      name: 'Black Ops 2',
      slug: 'bo2',
      image: 'assets/games/bo2.webp',
      platforms: [
        { name: 'Plutonium', slug: 'plutonium', color: '#991b1b', hoverColor: '#b91c1c', icon: 'fa-solid fa-desktop' },
        { name: 'Xbox', slug: 'xbox', color: '#14532d', hoverColor: '#166534', icon: 'fa-brands fa-xbox' },
        { name: 'PlayStation', slug: 'ps3', color: '#1e3a5f', hoverColor: '#1e4d8a', icon: 'fa-brands fa-playstation' }
      ]
    },
  ];

  constructor(private router: Router) {}

  selectGame(slug: string | null): void {
    this.selectedGame = slug;
  }

  selectPlatform(game: Game, platform: GamePlatform): void {
    this.router.navigate(['/leaderboards', game.slug, platform.slug]);
  }
}
