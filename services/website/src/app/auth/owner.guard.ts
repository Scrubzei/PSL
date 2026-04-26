import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const ownerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  alert(user?.role)
  if (user?.role === 'owner') {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
