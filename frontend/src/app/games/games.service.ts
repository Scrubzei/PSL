import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GameMap {
  id: string;
  mapName: string;
}

@Injectable({
  providedIn: 'root'
})
export class GamesService {
  private readonly API_URL = `${environment.apiUrl}/games`;

  constructor(private http: HttpClient) {}

  getMapsByGame(gameName: string): Observable<GameMap[]> {
    return this.http.get<GameMap[]>(`${this.API_URL}/${gameName}/maps`);
  }
}
