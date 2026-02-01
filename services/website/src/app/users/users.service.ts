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
}
