import { Injectable, signal } from '@angular/core';

export type Platform = 'Plutonium' | 'IW4X' | 'Xbox' | 'PS3';

const PLATFORM_KEY = 'selected_platform';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  currentPlatform = signal<Platform>('PS3');

  setPlatform(platform: Platform): void {
    this.currentPlatform.set(platform);
    localStorage.setItem(PLATFORM_KEY, platform);
    // Always keep PS3 blue theme
  }

  applyGoldTheme(): void {
    const body = document.body;
    body.classList.add('theme-gold');
  }

  // Initialize theme on app start
  init(): void {
    // Check if Hall of Fame transition is active
    if (localStorage.getItem('hof-transition') === 'true') {
      this.applyGoldTheme();
      return;
    }

    const saved = localStorage.getItem(PLATFORM_KEY) as Platform | null;
    if (saved && ['Plutonium', 'IW4X', 'Xbox', 'PS3'].includes(saved)) {
      this.currentPlatform.set(saved);
    }
  }
}
