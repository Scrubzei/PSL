import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, PendingAuthAction } from './auth.service';
import { LeaderboardsService } from '../leaderboard/leaderboards.service';
import { LeaderboardChallengeModalComponent } from '../leaderboard/leaderboard-challenge-modal.component';
import { ChallengesService } from '../challenges/challenges.service';

@Injectable({
  providedIn: 'root'
})
export class PendingActionService {
  constructor(
    private authService: AuthService,
    private leaderboardsService: LeaderboardsService,
    private challengesService: ChallengesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  async executePendingAction(): Promise<void> {
    const action = this.authService.getPendingAction();
    if (!action) return;

    // Navigate to return URL first
    await this.router.navigate([action.returnUrl]);

    // Small delay to let the page load
    await new Promise(resolve => setTimeout(resolve, 500));

    switch (action.type) {
      case 'LEADERBOARD_SIGNUP':
        await this.executeLeaderboardSignup(action);
        break;
      case 'CHALLENGE_USER':
        await this.executeChallengeUser(action);
        break;
    }
  }

  private async executeLeaderboardSignup(action: PendingAuthAction): Promise<void> {
    if (!action.payload.leaderboardId) {
      console.error('No leaderboard ID in pending action');
      return;
    }

    this.leaderboardsService.signup(action.payload.leaderboardId).subscribe({
      next: () => {
        this.snackBar.open('Successfully signed up for the leaderboard!', 'Close', { duration: 3000 });
        // Reload the page to show updated data
        window.location.reload();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to sign up', 'Close', { duration: 3000 });
      }
    });
  }

  private async executeChallengeUser(action: PendingAuthAction): Promise<void> {
    const { opponentId, opponentUsername, game, platform, matchType } = action.payload;

    if (!opponentId || !opponentUsername || !game || !platform) {
      console.error('Missing data in pending challenge action');
      return;
    }

    // Open the challenge modal with the stored data
    const dialogRef = this.dialog.open(LeaderboardChallengeModalComponent, {
      width: '500px',
      panelClass: 'challenge-modal-panel',
      data: {
        opponent: { id: opponentId, username: opponentUsername },
        game: game,
        platform: platform,
        type: matchType || 'RANKED'
      }
    });

    // Handle the result - the leaderboard detail component normally handles this,
    // but since we're opening from the callback, we need to handle it here
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Need to get leaderboard ID - fetch it based on game/platform
        this.leaderboardsService.getByGameAndPlatform(game, platform).subscribe({
          next: (leaderboard) => {
            this.challengesService.createChallenge({
              challengeeId: result.opponent.id,
              leaderboardId: leaderboard.id,
              type: result.type,
              bestOf: result.bestOf,
              selectedMaps: result.maps,
              linkOnly: result.linkOnly || false
            }).subscribe({
              next: () => {
                this.snackBar.open('Challenge sent!', 'Close', { duration: 3000 });
              },
              error: (err) => {
                this.snackBar.open(err.error?.message || 'Failed to send challenge', 'Close', { duration: 3000 });
              }
            });
          },
          error: () => {
            this.snackBar.open('Failed to load leaderboard data', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }
}
