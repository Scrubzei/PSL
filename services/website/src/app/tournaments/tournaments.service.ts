import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Tournament {
  id: string;
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

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';
  nextMatchId: string | null;
  player1: { id: string; username: string } | null;
  player2: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
}

export interface BracketResponse {
  tournament: Tournament;
  matches: TournamentMatch[];
}

export interface CreateTournamentDto {
  name: string;
  description?: string;
  gameId: string;
  platformId: string;
  format: 'SINGLE_ELIMINATION';
  maxParticipants: number;
  registrationDeadline?: string;
  startDate?: string;
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

  startTournament(tournamentId: string): Observable<Tournament> {
    return this.http.post<Tournament>(`${this.API_URL}/${tournamentId}/start`, {});
  }

  reportResult(matchId: string, winnerId: string): Observable<TournamentMatch> {
    return this.http.patch<TournamentMatch>(`${this.API_URL}/matches/${matchId}/result`, {
      winnerId,
    });
  }
}
