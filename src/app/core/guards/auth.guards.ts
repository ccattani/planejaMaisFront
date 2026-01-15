// src/app/core/guards/auth.guard.ts
import { inject } from "@angular/core";
import { CanMatchFn, Router } from "@angular/router";
import { AuthService } from "../service/auth.service";

export const authGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // mínimo decente: token existe e é válido (não expirou)
  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(["/auth/login"]);
};
