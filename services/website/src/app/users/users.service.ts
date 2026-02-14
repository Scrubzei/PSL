import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  goldTrophies: number;
  silverTrophies: number;
  bronzeTrophies: number;
  hofTrophies: number;
  hallOfFame: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecentMatch {
  id: string;
  opponent: { id: string; username: string; avatar?: string };
  game: string;
  platform: string;
  type: 'XP' | 'RANKED';
  status: string;
  isChallenger: boolean;
  winnerId: string | null;
  isWinner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalWins: number;
  totalLosses: number;
  winRate: number;
  recentMatches: RecentMatch[];
}

export interface LeaderboardRanking {
  leaderboardId: string;
  game: string;
  platform: string;
  rank: number;
  totalPlayers: number;
  xp: number;
  rankScore: number;
  wins: number;
  losses: number;
}

export interface DashboardStats {
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  leaderboardRankings: LeaderboardRanking[];
}

export interface GlobalRecentWin {
  matchId: string;
  winner: { id: string; username: string; avatar?: string };
  loser: { id: string; username: string; avatar?: string };
  game: string;
  platform: string;
  matchType: 'XP' | 'RANKED';
  completedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly API_URL = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(username?: string): Observable<UserProfile[]> {
    let params = new HttpParams();
    if (username) {
      params = params.set('username', username);
    }
    return this.http.get<UserProfile[]>(this.API_URL, { params });
  }

  getUserById(id: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.API_URL}/${id}`);
  }

  getUserStats(id: string): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.API_URL}/${id}/stats`);
  }

  getDashboardStats(id: string): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.API_URL}/${id}/dashboard-stats`);
  }

  getGlobalRecentWins(limit: number = 10): Observable<GlobalRecentWin[]> {
    return this.http.get<GlobalRecentWin[]>(`${this.API_URL}/recent-wins`, {
      params: new HttpParams().set('limit', limit.toString())
    });
  }

  updateProfile(data: { plutoniumUsername?: string }): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/auth/profile`, data);
  }

}
