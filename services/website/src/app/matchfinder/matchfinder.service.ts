import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MatchfinderListing {
  id: string;
  challengerId: string;
  status: string;
  bestOf: number;
  selectedMaps: string[];
  createdAt: string;
  challenger: {
    id: string;
    username: string;
  };
  leaderboard: {
    id: string;
    game: { id: string; name: string };
    platform: { id: string; name: string };
  };
}

@Injectable({
  providedIn: 'root'
})
export class MatchfinderService {
  private readonly API_URL = `${environment.apiUrl}/matches/matchfinder`;

  constructor(private http: HttpClient) {}

  getListings(game: string, platform: string): Observable<MatchfinderListing[]> {
    return this.http.get<MatchfinderListing[]>(this.API_URL, {
      params: { game, platform }
    });
  }

  createListing(data: { game: string; platform: string; bestOf: number; selectedMaps: string[] }): Observable<MatchfinderListing> {
    return this.http.post<MatchfinderListing>(this.API_URL, data);
  }

  acceptListing(id: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/accept`, {});
  }

  cancelListing(id: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/cancel`, {});
  }
}
