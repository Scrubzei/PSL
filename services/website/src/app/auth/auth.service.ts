import { Injectable, signal, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";
import { NotificationsService } from "../notifications/notifications.service";
import { environment } from "../../environments/environment";

export type UserRole = "player" | "ref" | "admin" | "owner";

export interface User {
  id: string;
  username: string | null;
  role: UserRole;
  avatar?: string;
  plutoniumUsername?: string | null;
  xboxGamertag?: string | null;
  psnUsername?: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface PendingAuthAction {
  type:
    | "LEADERBOARD_SIGNUP"
    | "CHALLENGE_USER"
    | "TOURNAMENT_SIGNUP"
    | "CREATE_MATCH";
  payload: {
    leaderboardId?: string;
    tournamentId?: string;
    opponentId?: string;
    opponentUsername?: string;
    game?: string;
    platform?: string;
    matchType?: "RANKED" | "XP";
  };
  returnUrl: string;
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = "access_token";
  private readonly PENDING_ACTION_KEY = "pending_auth_action";

  currentUser = signal<User | null>(null);
  needsUsername = signal<boolean>(false);
  suggestedUsername = signal<string | null>(null);

  private notificationsService = inject(NotificationsService);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadUserFromToken();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
    this.notificationsService.clearNotifications();
    this.router.navigate(["/leaderboards"]);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private loadUserFromToken(): void {
    const token = this.getToken();
    if (token) {
      this.http.get<User>(`${this.API_URL}/profile`).subscribe({
        next: (user) => {
          this.currentUser.set(user);
          // Check if user needs to set username
          this.needsUsername.set(!user.username);
        },
        error: (err) => {
          console.error(
            "Failed to load user profile:",
            err.status,
            err.message,
          );
          // Only clear token if it's actually invalid (401)
          // Don't clear on network errors, server errors, etc.
          if (err.status === 401) {
            localStorage.removeItem(this.TOKEN_KEY);
            this.currentUser.set(null);
          } else if (err.status === 0 || err.status >= 500) {
            // Network error or server error - retry after a delay
            setTimeout(() => this.loadUserFromToken(), 2000);
          }
        },
      });
    }
  }

  initiateDiscordLogin(): void {
    // Redirect to backend Discord OAuth endpoint
    window.location.href = `${this.API_URL}/discord`;
  }

  handleDiscordCallback(
    token: string,
    needsUsername: boolean,
    discordUsername?: string | null,
  ): Observable<User> {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.needsUsername.set(needsUsername);
    this.suggestedUsername.set(discordUsername || null);

    // Load user profile and return observable for caller to handle navigation
    return this.http.get<User>(`${this.API_URL}/profile`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.notificationsService.clearNotifications();
        this.notificationsService.refreshNotifications();
      }),
    );
  }

  // Helper to navigate after Discord callback (called by discord-callback component)
  navigateAfterDiscordLogin(needsUsername: boolean): void {
    if (needsUsername) {
      this.router.navigate(["/choose-username"]);
    } else if (this.hasPendingAction()) {
      // Don't navigate - PendingActionService will handle it
      return;
    } else {
      // Check for pending match redirect (legacy)
      const pendingRedirect = localStorage.getItem("pendingMatchRedirect");
      if (pendingRedirect) {
        localStorage.removeItem("pendingMatchRedirect");
        this.router.navigate([pendingRedirect]);
      } else {
        this.router.navigate(["/dashboard"]);
      }
    }
  }

  setUsername(username: string): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>(`${this.API_URL}/set-username`, { username })
      .pipe(
        tap((response) => {
          this.currentUser.set(response.user);
          this.needsUsername.set(false);

          // Check for pending match redirect
          const pendingRedirect = localStorage.getItem("pendingMatchRedirect");
          if (pendingRedirect) {
            localStorage.removeItem("pendingMatchRedirect");
            this.router.navigate([pendingRedirect]);
          } else {
            this.router.navigate(["/dashboard"]);
          }
        }),
      );
  }

  // Pending action methods for guest -> login flow
  storePendingAction(action: PendingAuthAction): void {
    localStorage.setItem(this.PENDING_ACTION_KEY, JSON.stringify(action));
  }

  getPendingAction(): PendingAuthAction | null {
    const action = localStorage.getItem(this.PENDING_ACTION_KEY);
    if (action) {
      localStorage.removeItem(this.PENDING_ACTION_KEY);
      try {
        return JSON.parse(action);
      } catch {
        return null;
      }
    }
    return null;
  }

  hasPendingAction(): boolean {
    return !!localStorage.getItem(this.PENDING_ACTION_KEY);
  }

  clearPendingAction(): void {
    localStorage.removeItem(this.PENDING_ACTION_KEY);
  }

  // Development-only login by username
  devLogin(username: string): Observable<AuthResponse> {
    if (environment.production) {
      throw new Error("Dev login is not available in production");
    }
    return this.http
      .post<AuthResponse>(`${this.API_URL}/dev-login`, { username })
      .pipe(
        tap((response) => {
          localStorage.setItem(this.TOKEN_KEY, response.access_token);
          this.currentUser.set(response.user);
          this.notificationsService.clearNotifications();
          this.notificationsService.refreshNotifications();
        }),
      );
  }

  devSetRole(userId: string, role: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/dev-set-role`, { userId, role });
  }
}
