import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const homeRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate(['/dashboard']);
  } else {
    router.navigate(['/leaderboards']);
  }

  return false;
};
