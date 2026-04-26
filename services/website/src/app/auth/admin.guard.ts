import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (user?.role === 'admin' || user?.role === 'owner') {
    return true;
  }

  router.navigate(['/tournaments']);
  return false;
};
