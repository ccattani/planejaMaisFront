import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../service/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const token = auth.getToken();

  // Evita mandar token em endpoints de auth (ajuste conforme sua API)
  const isAuthEndpoint = req.url.includes("/auth/");
  if (!token || isAuthEndpoint) return next(req);

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        auth.clearToken();
        router.navigate(["/auth/login"]);
      }
      return throwError(() => err);
    })
  );
};
