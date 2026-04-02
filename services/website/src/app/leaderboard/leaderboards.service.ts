import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Leaderboard {
  id: string;
  gameId: string;
  platformId: string;
  game: { id: string; name: string };
  platform: { id: string; name: string };
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  userId: string;
  username: string;
  emblem: string | null;
  xp: number;
  rankScore: number;
  elo: number | null;
  rankedOptIn: boolean;
  xpOptIn: boolean;
  wins: number;
  losses: number;
  createdAt: string;
}

export interface MyEntryResponse {
  isSignedUp: boolean;
  entry: LeaderboardEntry | null;
}

@Injectable({
  providedIn: 'root'
})
export class LeaderboardsService {
  private readonly API_URL = `${environment.apiUrl}/leaderboards`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Leaderboard[]> {
    return this.http.get<Leaderboard[]>(this.API_URL);
  }

  getByGameAndPlatform(game: string, platform: string): Observable<Leaderboard> {
    const params = new HttpParams().set('game', game).set('platform', platform);
    return this.http.get<Leaderboard>(`${this.API_URL}/by-game-platform`, { params });
  }

  getById(id: string): Observable<Leaderboard> {
    return this.http.get<Leaderboard>(`${this.API_URL}/${id}`);
  }

  getEntries(leaderboardId: string, type: 'ranked' | 'xp'): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(`${this.API_URL}/${leaderboardId}/entries?type=${type}`);
  }

  signup(leaderboardId: string): Observable<LeaderboardEntry> {
    return this.http.post<LeaderboardEntry>(`${this.API_URL}/${leaderboardId}/signup`, {});
  }

  xpJoin(leaderboardId: string): Observable<LeaderboardEntry> {
    return this.http.post<LeaderboardEntry>(`${this.API_URL}/${leaderboardId}/xp-join`, {});
  }

  getMyEntry(leaderboardId: string): Observable<MyEntryResponse> {
    return this.http.get<MyEntryResponse>(`${this.API_URL}/${leaderboardId}/my-entry`);
  }

  updateRanks(leaderboardId: string, ranks: { userId: string; rank: number }[]): Observable<any> {
    return this.http.put(`${this.API_URL}/${leaderboardId}/ranks`, { ranks });
  }

  addPlayer(leaderboardId: string, username: string): Observable<LeaderboardEntry> {
    return this.http.post<LeaderboardEntry>(`${this.API_URL}/${leaderboardId}/add-player`, { username });
  }
}
