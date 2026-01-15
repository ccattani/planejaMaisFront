// src/app/core/services/auth.service.ts
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly tokenKey = "token";

  getToken(): string | null {
    return (
      localStorage.getItem(this.tokenKey) ||
      sessionStorage.getItem(this.tokenKey)
    );
  }

  setToken(token: string, remember: boolean) {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
    (remember ? localStorage : sessionStorage).setItem(this.tokenKey, token);
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Só valida expiração se for JWT (3 partes)
    if (token.split(".").length !== 3) return true;

    return !this.isJwtExpired(token);
  }

  private isJwtExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload?.exp;
      if (!exp) return false;
      return Math.floor(Date.now() / 1000) >= exp;
    } catch {
      return true;
    }
  }
}
