import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token =
    localStorage.getItem('token') ||
    sessionStorage.getItem('token');

  if (!token) return next(req);

  const clone = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(clone);
};
