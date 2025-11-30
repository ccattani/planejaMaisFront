import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { RegisterPayload } from "../interfaces/register";
import { LoginPayload } from "../interfaces/login";
import { UpdatePayload } from "../interfaces/update";

@Injectable({
  providedIn: "root",
})
export class ServicesService {
  private api = "https://planeja-mais-backend.vercel.app/api";

  constructor(private http: HttpClient) {}

  createAccount(payload: RegisterPayload) {
    return firstValueFrom(this.http.post(`${this.api}/login/create`, payload));
  }

  login(payload: LoginPayload) {
    return firstValueFrom(
      this.http.post(`${this.api}/login/autentication`, payload, {
        responseType: "text",
      })
    );
  }

  getMyAccount() {
    return firstValueFrom(this.http.get(`${this.api}/login/myAccount`));
  }

  getForgottenPassword(email: string) {
    return firstValueFrom(
      this.http.get(`${this.api}/login/forgotPassword/${email}`)
    );
  }

  newPassword(payload: { passwordHash: string }, token: string) {
    return firstValueFrom(
      this.http.post(`${this.api}/login/newPassword`, payload,
        {
        headers: {
          authorization: `Bearer ${token}`
        }
      }
      )
    );
  }

  updateUser(payload: UpdatePayload) {
    return firstValueFrom(this.http.patch(`${this.api}/login/update`, payload));
  }

  deleteUser() {
    return firstValueFrom(this.http.delete(`${this.api}/login/delete`));
  }

  sendAuthEmail() {
    return firstValueFrom(
      this.http.get(`${this.api}/login/autenticateAccountEmail`)
    );
  }
}
