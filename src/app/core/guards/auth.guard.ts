import { inject } from '@angular/core';
import { Router, CanMatchFn } from '@angular/router';
import { AuthService } from '../auth.service';
import { filter, map, take } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return combineLatest([
    toObservable(auth.authReady),
    toObservable(auth.user)
  ]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([, user]) => (user ? true : router.createUrlTree(['/auth'])))
  );
};
