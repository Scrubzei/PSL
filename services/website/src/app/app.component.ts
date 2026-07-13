import {
  Component,
  OnInit,
} from "@angular/core";
import { RouterOutlet, NavigationEnd, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatIconRegistry } from "@angular/material/icon";
import { MatDialog } from "@angular/material/dialog";
import { ThemeService } from "./shared/theme.service";
import { HallOfFameService } from "./shared/hall-of-fame.service";
import { NavbarComponent } from "./shared/navbar.component";
import { WelcomeModalComponent } from "./shared/welcome-modal.component";

import { filter } from "rxjs/operators";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent],
  template: `
    <div class="app-layout">
      @if (showNavbar) {
        <app-navbar></app-navbar>
      }
      <div class="page-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      .app-layout {
        width: 100%;
        height: 100dvh;
        display: flex;
        flex-direction: column;
        background: #0a0a0f;
      }

      .page-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 0;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  title = "frontend";
  showNavbar = true;

  private noNavbarRoutes = [
    "/discord-callback",
    "/username-selection",
    "/dev-login",
  ];

  private exactNoNavbarRoutes: string[] = [];

  constructor(
    private themeService: ThemeService,
    private iconRegistry: MatIconRegistry,
    public hofService: HallOfFameService,
    private router: Router,
    private dialog: MatDialog,
  ) {
    this.iconRegistry.setDefaultFontSetClass("material-symbols-outlined");
    this.iconRegistry.registerFontClassAlias(
      "material-symbols-outlined",
      "material-symbols-outlined",
    );

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showNavbar =
          !this.exactNoNavbarRoutes.includes(event.urlAfterRedirects) &&
          !this.noNavbarRoutes.some((route) =>
            event.urlAfterRedirects.startsWith(route),
          );
        const pageContent = document.querySelector(".page-content");
        if (pageContent) pageContent.scrollTop = 0;
      });
  }

  ngOnInit(): void {
    this.themeService.init();
    this.hideLoader();
    this.showWelcomeModal();
  }

  private hideLoader(): void {
    const loader = document.getElementById('psl-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 600);
    }
  }

  private showWelcomeModal(): void {
    const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
    if (hasSeenWelcome) return;

    setTimeout(() => {
      const dialogRef = this.dialog.open(WelcomeModalComponent, {
        panelClass: "welcome-dialog",
        disableClose: true,
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe(() => {
        localStorage.setItem("hasSeenWelcome", "true");
      });
    }, 500);
  }
}
