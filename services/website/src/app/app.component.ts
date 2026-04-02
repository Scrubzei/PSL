import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  effect,
} from "@angular/core";
import { RouterOutlet, NavigationEnd, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatIconRegistry } from "@angular/material/icon";
import { MatDialog } from "@angular/material/dialog";
import gsap from "gsap";
import { ThemeService } from "./shared/theme.service";
import { HallOfFameService } from "./shared/hall-of-fame.service";
import { NavbarComponent } from "./shared/navbar.component";
import { WelcomeModalComponent } from "./shared/welcome-modal.component";

import { filter } from "rxjs/operators";

interface HallOfFamePlayer {
  name: string;
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent],
  template: `
    <!-- Invisible clickable overlay that appears after animation completes -->
    @if (hofService.isOpen() && !isAnimating) {
      <button class="back-btn-clickable" (click)="closeHof()"></button>
    }

    <div
      class="scene"
      [class.animating]="isAnimating"
      [class.hof-open]="hofService.isOpen()"
    >
      <div class="cube" #cube>
        <div class="face front" [class.inactive]="hofService.isOpen()">
          @if (showNavbar) {
            <app-navbar></app-navbar>
          }
          <div class="page-content">
            <router-outlet></router-outlet>
          </div>
        </div>
        <div class="face left"></div>
        <div class="face right">
          <div class="hof-content">
            <div class="bg-image"></div>
            <div class="bg-overlay"></div>
            <div class="scanlines"></div>
            <div class="vignette"></div>

            <div class="embers">
              @for (i of embers; track i) {
                <div class="ember" [style.--i]="i"></div>
              }
            </div>

            <div class="content">
              <!-- Visual back button that animates with the cube -->
              <div class="back-btn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                  />
                </svg>
                <span>Back</span>
              </div>

              <div class="hero-section">
                <h1 class="title">HALL OF FAME</h1>
              </div>

              <div class="platform-section">
                <h2 class="platform-title">BO2 Xbox</h2>
                <div class="names-list">
                  @for (player of xboxPlayers; track player.name) {
                    <div class="player-name">{{ player.name }}</div>
                  }
                </div>
              </div>

              <div class="platform-section">
                <h2 class="platform-title">BO2 PlayStation</h2>
                <div class="names-list">
                  @for (player of ps3Players; track player.name) {
                    <div class="player-name">{{ player.name }}</div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
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

      .scene {
        width: 100vw;
        height: 100dvh;
        perspective: 1200px;
        perspective-origin: center center;
        overflow: hidden;
      }

      .cube {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transform: translateZ(-50vw);
      }

      .face {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
      }

      .front {
        transform: rotateY(0deg) translateZ(50vw);
        overflow: hidden;
        background: #121212;
        display: flex;
        flex-direction: column;
      }

      .page-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 0;
      }

      .front.inactive {
        pointer-events: none;
      }

      .left {
        background: #0a0a0a;
        transform: rotateY(-90deg) translateZ(50vw);
      }

      .right {
        background: #0a0a0a;
        transform: rotateY(90deg) translateZ(50vw);
        overflow: visible;
        pointer-events: auto;
      }

      .hof-content {
        width: 100%;
        height: 100%;
        position: relative;
        pointer-events: auto;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
          display: none;
        }
      }

      .bg-image {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: url("/assets/games/bo2.webp") center/cover no-repeat;
        opacity: 0.2;
        filter: saturate(0.5) brightness(0.8);
        pointer-events: none;
      }

      .bg-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background:
          radial-gradient(
            ellipse at 50% 30%,
            rgba(255, 140, 0, 0.15) 0%,
            transparent 60%
          ),
          linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.4) 0%,
            rgba(0, 0, 0, 0.8) 100%
          );
        pointer-events: none;
      }

      .scanlines {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.1) 0px,
          rgba(0, 0, 0, 0.1) 1px,
          transparent 1px,
          transparent 2px
        );
        pointer-events: none;
      }

      .vignette {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-shadow: inset 0 0 150px rgba(0, 0, 0, 0.9);
        pointer-events: none;
      }

      .embers {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
      }

      .ember {
        position: absolute;
        width: 3px;
        height: 3px;
        background: #ff8c00;
        border-radius: 50%;
        bottom: -10px;
        left: calc(var(--i) * 5%);
        opacity: 0;
        box-shadow: 0 0 6px 2px rgba(255, 140, 0, 0.6);
        animation: rise 4s ease-in infinite;
        animation-delay: calc(var(--i) * 0.2s);
      }

      @keyframes rise {
        0% {
          opacity: 0;
          transform: translateY(0) scale(1);
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          opacity: 0;
          transform: translateY(-100vh) scale(0);
        }
      }

      .content {
        position: relative;
        z-index: 5;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 30px 20px 100px 20px;
        box-sizing: border-box;
      }

      /* Invisible clickable area positioned over the visual button */
      .back-btn-clickable {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 10000;
        width: 95px;
        height: 42px;
        background: transparent;
        border: none;
        cursor: pointer;
      }

      /* Visual button inside the cube that animates */
      .back-btn {
        position: absolute;
        top: 20px;
        left: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: rgba(255, 140, 0, 0.1);
        border: 1px solid rgba(255, 140, 0, 0.3);
        border-radius: 6px;
        color: #ff8c00;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
        pointer-events: none;

        svg {
          width: 18px;
          height: 18px;
        }
      }

      .hero-section {
        text-align: center;
        margin-top: 40px;
        margin-bottom: 50px;
      }

      .title {
        font-size: clamp(36px, 10vw, 64px);
        font-weight: 900;
        letter-spacing: 6px;
        margin: 0;
        color: #fff;
        text-shadow:
          0 0 20px rgba(255, 140, 0, 0.5),
          0 4px 8px rgba(0, 0, 0, 0.5);
      }

      .platform-section {
        margin-bottom: 50px;
        text-align: center;
      }

      .platform-title {
        font-size: clamp(18px, 4vw, 24px);
        font-weight: 700;
        letter-spacing: 4px;
        color: #ff8c00;
        margin: 0 0 24px 0;
        text-transform: uppercase;
      }

      .names-list {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .player-name {
        font-size: clamp(18px, 4vw, 24px);
        font-weight: 600;
        color: #fff;
        letter-spacing: 3px;
        text-transform: uppercase;
      }

      @media (max-width: 600px) {
        .content {
          padding: 20px 16px;
        }

        .back-btn-clickable {
          top: 16px;
          left: 16px;
          width: 40px;
          height: 38px;
        }

        .back-btn {
          top: 16px;
          left: 16px;
          padding: 8px 12px;

          span {
            display: none;
          }
        }

        .hero-section {
          margin-top: 60px;
          margin-bottom: 30px;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  @ViewChild("cube") cube!: ElementRef;

  title = "frontend";
  isAnimating = false;
  showNavbar = true;

  // Routes that should not show the navbar
  private noNavbarRoutes = [
    "/discord-callback",
    "/username-selection",
    "/dev-login",
  ];

  xboxPlayers: HallOfFamePlayer[] = [
    { name: "Inicity" },
    { name: "Wubzei" },
    { name: "Relxa" },
    { name: "Zapsi" },
    { name: "Scrubzei" },
    { name: "Oxentary" },
    { name: "Flashxng" },
    { name: "Yelicate" },
    { name: "Daxterity" },
    { name: "Quickzei" },
    { name: "xJiant" },
    { name: "Venxtic" },
  ];

  ps3Players: HallOfFamePlayer[] = [
    { name: "Mezmerxzed" },
    { name: "zWrecky" },
    { name: "Marathxnz" },
    { name: "Biosity" },
    { name: "Ynzerx" },
    { name: "Persxcution_rf" },
    { name: "xJiant" },
    { name: "Seven" },
    { name: "Azii" },
    { name: "oVerxtigo" },
    { name: "AdjusT_Fuhrer" },
    { name: "Gxoatzi" },
    { name: "Altuiz" },
  ];

  embers = Array.from({ length: 20 }, (_, i) => i);

  constructor(
    private themeService: ThemeService,
    private iconRegistry: MatIconRegistry,
    public hofService: HallOfFameService,
    private router: Router,
    private dialog: MatDialog,
  ) {
    // Register Material Symbols font
    this.iconRegistry.setDefaultFontSetClass("material-symbols-outlined");
    this.iconRegistry.registerFontClassAlias(
      "material-symbols-outlined",
      "material-symbols-outlined",
    );

    // React to Hall of Fame open/close
    effect(() => {
      if (this.hofService.isOpen()) {
        this.openHof();
      }
    });

    // Track route changes to show/hide navbar and scroll to top
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showNavbar = !this.noNavbarRoutes.some((route) =>
          event.urlAfterRedirects.startsWith(route),
        );
        const pageContent = document.querySelector(".page-content");
        if (pageContent) pageContent.scrollTop = 0;
      });
  }

  ngOnInit(): void {
    this.themeService.init();
    this.showWelcomeModal();
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

  private openHof(): void {
    // Add slow transition first, then gold theme
    document.body.classList.add("slow-transition");

    // Small delay to ensure transition is applied before color change
    requestAnimationFrame(() => {
      document.body.classList.add("theme-gold");
    });

    this.isAnimating = true;

    // Delay for theme transition to complete before cube animation starts
    setTimeout(() => {
      if (!this.cube) return;

      gsap.fromTo(
        this.cube.nativeElement,
        { rotateY: 0 },
        {
          rotateY: -90,
          duration: 2,
          ease: "power2.inOut",
          onComplete: () => {
            this.isAnimating = false;
            document.body.classList.remove("slow-transition");
          },
        },
      );
    }, 600);
  }

  closeHof(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;

    gsap.to(this.cube.nativeElement, {
      rotateY: 0,
      duration: 2,
      ease: "power2.inOut",
      onComplete: () => {
        // Restore theme
        document.body.classList.remove("theme-gold");
        this.themeService.init();

        this.hofService.close();
        this.isAnimating = false;
      },
    });
  }
}
