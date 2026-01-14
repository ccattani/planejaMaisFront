import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { RegisterPayload } from "../../shared/models/interfaces/register";
import { LoginPayload } from "../../shared/models/interfaces/login";
import { UpdatePayload } from "../../shared/models/interfaces/update";
import { TransactionPayload } from "../../shared/models/interfaces/transaction";

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

  sendAuthEmail(token: string) {
    return firstValueFrom(
      this.http.get(`${this.api}/login/autenticateAccountEmail`,
        {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'text'
      }
      )
    );
  }

  getAllTransactions() {
    return firstValueFrom(this.http.get(`${this.api}/expense/myExpenseByFilter`));
  }

  createExpense(payload: TransactionPayload) {
    return firstValueFrom(
      this.http.post(`${this.api}/expense/create`, payload)
    );
  }

  updateExpense(id: string, payload: TransactionPayload) {
    return firstValueFrom(
      this.http.patch(`${this.api}/expense/update/${id}`, payload)
    );
  }

  deleteExpense(id: string) {
    return firstValueFrom(this.http.delete(`${this.api}/expense/delete/${id}`));
  }

}
