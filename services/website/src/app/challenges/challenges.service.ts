import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type MatchType = 'XP' | 'RANKED';
export type MatchStatus = 'SEARCHING' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';

export type DisputePhase =
  | 'NONE'
  | 'PLAYER_MISMATCH'
  | 'AWAITING_REF'
  | 'REF_DECIDED'
  | 'AWAITING_ADMIN'
  | 'FINAL';

export interface MapResult {
  mapName: string;
  winner: 'challenger' | 'challengee';
}

export interface Match {
  id: string;
  challengerId: string;
  challengeeId: string | null;
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
  disputePhase?: DisputePhase;
  eloApplied?: boolean;
  refResolvedByUserId?: string | null;
  adminResolvedByUserId?: string | null;
  challengerEloBefore?: number | null;
  challengeeEloBefore?: number | null;
  createdAt: string;
  updatedAt: string;
  challenger: {
    id: string;
    username: string;
  };
  challengee: {
    id: string;
    username: string;
  } | null;
  leaderboard: {
    id: string;
    game: { id: string; name: string };
    platform: { id: string; name: string };
  };
}

export interface CreateMatchDto {
  challengeeId?: string;
  leaderboardId: string;
  type: MatchType;
  bestOf: number;
  selectedMaps: string[];
  wagerAmount?: number;
  message?: string;
  linkOnly?: boolean;
  /** XP open listing (matchfinder); omit challengeeId. */
  openListing?: boolean;
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

  /** Post an XP open match (no opponent until someone accepts). */
  createOpenXpMatch(body: {
    leaderboardId: string;
    bestOf: number;
    selectedMaps: string[];
    message?: string;
  }): Observable<Match> {
    return this.http.post<Match>(this.API_URL, {
      ...body,
      type: 'XP',
      openListing: true,
    });
  }

  /** Pending XP listings with no opponent yet for a leaderboard. */
  getXpOpenMatches(params: {
    leaderboardId?: string;
    game?: string;
    platform?: string;
    limit?: number;
  }): Observable<Match[]> {
    let httpParams = new HttpParams();
    if (params.leaderboardId) {
      httpParams = httpParams.set('leaderboardId', params.leaderboardId);
    }
    if (params.game) {
      httpParams = httpParams.set('game', params.game);
    }
    if (params.platform) {
      httpParams = httpParams.set('platform', params.platform);
    }
    if (params.limit != null) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    return this.http.get<Match[]>(`${this.API_URL}/xp-open`, { params: httpParams });
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

  reportResult(
    id: string,
    reportedWinnerId: string,
    mapResults: { mapName: string; winner: 'challenger' | 'challengee' }[],
  ): Observable<Match> {
    return this.http.patch<Match>(`${this.API_URL}/${id}/report-result`, {
      reportedWinnerId,
      mapResults,
    });
  }

  concedeDispute(id: string): Observable<Match> {
    return this.http.patch<Match>(`${this.API_URL}/${id}/concede`, {});
  }

  moderateMatch(id: string, winnerId: string): Observable<Match> {
    return this.http.patch<Match>(`${this.API_URL}/${id}/moderate`, { winnerId });
  }

  disputeRefDecision(id: string): Observable<Match> {
    return this.http.post<Match>(`${this.API_URL}/${id}/dispute-ref-decision`, {});
  }

  getModerationQueue(): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.API_URL}/disputes/moderation-queue`);
  }
}
