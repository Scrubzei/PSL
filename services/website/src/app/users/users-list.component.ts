import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
// NOT RELEASED YET - Challenge feature imports
// import { MatButtonModule } from '@angular/material/button';
// import { MatDialog } from '@angular/material/dialog';
// import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
// import { switchMap } from 'rxjs/operators';
// import { ChallengeModalComponent } from './challenge-modal.component';
// import { AuthService } from '../auth/auth.service';
// import { ChallengesService } from '../challenges/challenges.service';
// import { LeaderboardsService } from '../leaderboard/leaderboards.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { UsersService, UserProfile } from './users.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit {
  // NOT RELEASED YET - was ['username', 'actions']
  displayedColumns: string[] = ['username'];
  users: UserProfile[] = [];
  searchControl = new FormControl('');

  constructor(
    private usersService: UsersService,
    private router: Router
    // NOT RELEASED YET - Challenge feature injections
    // private dialog: MatDialog,
    // private snackBar: MatSnackBar,
    // private authService: AuthService,
    // private challengesService: ChallengesService,
    // private leaderboardsService: LeaderboardsService
  ) {}

  ngOnInit(): void {
    this.loadUsers();

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(username => {
      this.loadUsers(username || '');
    });
  }

  loadUsers(username?: string): void {
    this.usersService.getUsers(username).subscribe(users => {
      this.users = users;
    });
  }

  viewProfile(user: UserProfile): void {
    this.router.navigate(['/users', user.id]);
  }

  // NOT RELEASED YET - Challenge feature
  // get currentUserId(): string | null {
  //   return this.authService.currentUser()?.id ?? null;
  // }
  //
  // openChallengeModal(user: UserProfile): void {
  //   const dialogRef = this.dialog.open(ChallengeModalComponent, {
  //     width: '95vw',
  //     maxWidth: '500px',
  //     panelClass: 'challenge-modal-panel',
  //     data: user
  //   });
  //
  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result) {
  //       this.leaderboardsService.getByGameAndPlatform(result.game, result.platform).pipe(
  //         switchMap(leaderboard => {
  //           return this.challengesService.createChallenge({
  //             challengeeId: result.opponent.id,
  //             leaderboardId: leaderboard.id,
  //             type: result.type === 'RANK' ? 'RANKED' : result.type,
  //             bestOf: result.bestOf,
  //             selectedMaps: result.maps
  //           });
  //         })
  //       ).subscribe({
  //         next: () => {
  //           this.snackBar.open('Challenge sent!', 'Close', { duration: 3000 });
  //         },
  //         error: (err) => {
  //           this.snackBar.open(err.error?.message || 'Failed to send challenge', 'Close', { duration: 3000 });
  //         }
  //       });
  //     }
  //   });
  // }
}
