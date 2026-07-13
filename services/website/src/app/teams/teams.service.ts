import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TeamMember {
  id: string;
  userId: string;
  role: 'captain' | 'member';
  joinedAt: string;
  user: {
    id: string;
    username: string;
    discordId: string;
    xboxGamertag?: string;
    avatar?: string;
  };
}

export interface TeamInvite {
  id: string;
  teamId: string;
  invitedUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  team?: Team;
  invitedUser?: { id: string; username: string };
  invitedBy?: { id: string; username: string };
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  game: string;
  region: string;
  logo?: string;
  color?: string;
  bio?: string;
  captainId: string;
  captain: { id: string; username: string };
  memberships: TeamMember[];
  invites?: TeamInvite[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private url = `${environment.apiUrl}/teams`;

  constructor(private http: HttpClient) {}

  getAll(game?: string): Observable<Team[]> {
    const params: Record<string, string> = {};
    if (game) params['game'] = game;
    return this.http.get<Team[]>(this.url, { params });
  }

  getById(id: string): Observable<Team> {
    return this.http.get<Team>(`${this.url}/${id}`);
  }

  getMyTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.url}/my`);
  }

  getMyInvites(): Observable<TeamInvite[]> {
    return this.http.get<TeamInvite[]>(`${this.url}/my/invites`);
  }

  create(data: { name: string; tag: string; game: string; region?: string; logo?: string; color?: string; bio?: string }): Observable<Team> {
    return this.http.post<Team>(this.url, data);
  }

  update(id: string, data: Partial<{ name: string; tag: string; region: string; logo: string; color: string; bio: string }>): Observable<Team> {
    return this.http.patch<Team>(`${this.url}/${id}`, data);
  }

  invite(teamId: string, userId: string): Observable<TeamInvite> {
    return this.http.post<TeamInvite>(`${this.url}/${teamId}/invite`, { userId });
  }

  acceptInvite(inviteId: string): Observable<Team> {
    return this.http.post<Team>(`${this.url}/invites/${inviteId}/accept`, {});
  }

  declineInvite(inviteId: string): Observable<any> {
    return this.http.post<any>(`${this.url}/invites/${inviteId}/decline`, {});
  }

  cancelInvite(inviteId: string): Observable<any> {
    return this.http.delete<any>(`${this.url}/invites/${inviteId}`);
  }

  kick(teamId: string, userId: string): Observable<any> {
    return this.http.delete<any>(`${this.url}/${teamId}/members/${userId}`);
  }

  leave(teamId: string): Observable<any> {
    return this.http.post<any>(`${this.url}/${teamId}/leave`, {});
  }

  disband(teamId: string): Observable<any> {
    return this.http.delete<any>(`${this.url}/${teamId}`);
  }
}
