import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Leaderboard, LeaderboardsService } from '../leaderboard/leaderboards.service';
import { ChallengesService, Match } from '../challenges/challenges.service';

@Injectable({
  providedIn: 'root',
})
export class MatchfinderService {
  constructor(
    private leaderboards: LeaderboardsService,
    private challenges: ChallengesService,
  ) {}

  getLeaderboard(game: string, platform: string): Observable<Leaderboard> {
    return this.leaderboards.getByGameAndPlatform(game, platform);
  }

  getXpOpenList(leaderboardId: string): Observable<Match[]> {
    return this.challenges.getXpOpenMatches({ leaderboardId, limit: 50 });
  }
}
