import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type MatchType = 'XP' | 'RANKED';
export type MatchStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';

export interface MapResult {
  mapName: string;
  winner: 'challenger' | 'challengee';
}

export interface Match {
  id: string;
  challengerId: string;
  challengeeId: string;
  leaderboardId: string;
  type: MatchType;
  status: MatchStatus;
  bestOf: number;
  selectedMaps: string[];
  wagerAmount?: number;
  message?: string;
  winnerId?: string;
  challengerReportedWinnerId?: string;
  challengeeReportedWinnerId?: string;
  challengerReportedMapResults?: MapResult[];
  challengeeReportedMapResults?: MapResult[];
  linkOnly?: boolean;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
  challenger: {
    id: string;
    username: string;
  };
  challengee: {
    id: string;
    username: string;
  };
  leaderboard: {
    id: string;
    game: { id: string; name: string };
    platform: { id: string; name: string };
  };
}

export interface CreateMatchDto {
  challengeeId: string;
  leaderboardId: string;
  type: MatchType;
  bestOf: number;
  selectedMaps: string[];
  wagerAmount?: number;
  message?: string;
  linkOnly?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChallengesService {
  private readonly API_URL = `${environment.apiUrl}/matches`;

  constructor(private http: HttpClient) {}

  createChallenge(data: CreateMatchDto): Observable<Match> {
    return this.http.post<Match>(this.API_URL, data);
  }

  getMyChallenges(status?: MatchStatus, role?: 'challenger' | 'challengee'): Observable<Match[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    if (role) {
      params = params.set('role', role);
    }
    return this.http.get<Match[]>(this.API_URL, { params });
  }

  getChallenge(id: string): Observable<Match> {
    return this.http.get<Match>(`${this.API_URL}/${id}`);
  }

  getMatchByShareToken(shareToken: string): Observable<Match> {
    return this.http.get<Match>(`${this.API_URL}/share/${shareToken}`);
  }

  acceptChallenge(id: string): Observable<Match> {
    return this.http.patch<Match>(`${this.API_URL}/${id}/accept`, {});
  }

  declineChallenge(id: string): Observable<Match> {
    return this.http.patch<Match>(`${this.API_URL}/${id}/decline`, {});
  }

  cancelChallenge(id: string): Observable<Match> {
    return this.http.patch<Match>(`${this.API_URL}/${id}/cancel`, {});
  }

  reportResult(id: string, reportedWinnerId: string): Observable<Match> {
    return this.http.patch<Match>(`${this.API_URL}/${id}/report-result`, {
      reportedWinnerId
    });
  }

  concedeDispute(id: string): Observable<Match> {
    return this.http.patch<Match>(`${this.API_URL}/${id}/concede`, {});
  }
}
