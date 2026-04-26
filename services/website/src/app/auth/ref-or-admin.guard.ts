import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const refOrAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const role = authService.currentUser()?.role;
  if (role === 'ref' || role === 'admin' || role === 'owner') {
    return true;
  }
  router.navigate(['/leaderboards']);
  return false;
};
