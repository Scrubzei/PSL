import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  gameId: string;
  platformId: string;
  format: 'SINGLE_ELIMINATION';
  maxParticipants: number;
  status: 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdById: string;
  registrationDeadline: string | null;
  startDate: string | null;
  roundDeadlines: { name: string; deadline: string | null }[] | null;
  prizePool: { place: number; prize: string }[] | null;
  howItWorks: string | null;
  disqualifications: string[] | null;
  sponsors: { name: string; url?: string }[] | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  game: { id: string; name: string };
  platform: { id: string; name: string };
  createdBy: { id: string; username: string };
  participantCount?: number;
}

export interface TournamentDetail extends Tournament {
  isSignedUp: boolean;
  participants: {
    id: string;
    seed: number | null;
    eliminated: boolean;
    user: { id: string; username: string };
  }[];
}

export interface GameMap {
  id: string;
  mapName: string;
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';
  nextMatchId: string | null;
  player1: { id: string; username: string } | null;
  player2: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  gameMaps?: GameMap[];
  isBye?: boolean;
}

export interface MyMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';
  player1: { id: string; username: string } | null;
  player2: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  gameMaps?: GameMap[];
  isBye?: boolean;
}

export interface MyMatchResponse {
  match: MyMatch | null;
}

export interface ActiveTournamentMatch {
  match: {
    id: string;
    round: number;
    matchNumber: number;
    status: string;
    player1: { id: string; username: string } | null;
    player2: { id: string; username: string } | null;
    gameMaps?: GameMap[];
  };
  tournament: {
    id: string;
    slug: string;
    name: string;
    game: { id: string; name: string } | null;
    platform: { id: string; name: string } | null;
  };
}

export interface BracketResponse {
  tournament: Tournament;
  matches: TournamentMatch[];
}

export interface CreateTournamentDto {
  name: string;
  slug: string;
  description?: string;
  gameId: string;
  platformId: string;
  format: 'SINGLE_ELIMINATION';
  maxParticipants: number;
  registrationDeadline?: string;
  startDate?: string;
  roundDeadlines?: { name: string; deadline: string | null }[];
  howItWorks?: string;
  disqualifications?: string[];
  sponsors?: { name: string; url?: string }[];
  isFeatured?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TournamentsService {
  private readonly API_URL = `${environment.apiUrl}/tournaments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(this.API_URL);
  }

  getOne(id: string): Observable<TournamentDetail> {
    return this.http.get<TournamentDetail>(`${this.API_URL}/${id}`);
  }

  create(dto: CreateTournamentDto): Observable<Tournament> {
    return this.http.post<Tournament>(this.API_URL, dto);
  }

  signup(tournamentId: string): Observable<any> {
    return this.http.post(`${this.API_URL}/${tournamentId}/signup`, {});
  }

  withdraw(tournamentId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${tournamentId}/signup`);
  }

  getBracket(tournamentId: string): Observable<BracketResponse> {
    return this.http.get<BracketResponse>(`${this.API_URL}/${tournamentId}/bracket`);
  }

  featureTournament(tournamentId: string): Observable<Tournament> {
    return this.http.patch<Tournament>(`${this.API_URL}/${tournamentId}/feature`, {});
  }

  updateSeeds(tournamentId: string, participantIds: string[]): Observable<any> {
    return this.http.patch(`${this.API_URL}/${tournamentId}/seed`, { participantIds });
  }

  startTournament(tournamentId: string): Observable<Tournament> {
    return this.http.post<Tournament>(`${this.API_URL}/${tournamentId}/start`, {});
  }

  reportResult(matchId: string, winnerId: string): Observable<TournamentMatch> {
    return this.http.patch<TournamentMatch>(`${this.API_URL}/matches/${matchId}/result`, {
      winnerId,
    });
  }

  getMyMatch(tournamentId: string): Observable<MyMatchResponse> {
    return this.http.get<MyMatchResponse>(`${this.API_URL}/${tournamentId}/my-match`);
  }

  getActiveMatches(): Observable<ActiveTournamentMatch[]> {
    return this.http.get<ActiveTournamentMatch[]>(`${this.API_URL}/user/active-matches`);
  }

  updateMatchMaps(matchId: string, mapIds: string[], gameId: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/matches/${matchId}/maps`, { mapIds, gameId });
  }

  getGameMaps(gameName: string): Observable<GameMap[]> {
    return this.http.get<GameMap[]>(`${environment.apiUrl}/games/${gameName}/maps`);
  }
}
