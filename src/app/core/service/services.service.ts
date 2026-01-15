import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { RegisterPayload } from "../../shared/models/interfaces/register";
import { LoginPayload } from "../../shared/models/interfaces/login";
import { UpdatePayload } from "../../shared/models/interfaces/update";
import { TransactionPayload } from "../../shared/models/interfaces/transaction";
import { FiltrosSomatorioLancamentos } from "../../shared/models/interfaces/filtroSomatorio";

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

  getSomatorioLancamentos(filtros?: FiltrosSomatorioLancamentos): Promise<number> {
    let parametros = new HttpParams();

    if (filtros?.startDate) parametros = parametros.set("startDate", filtros.startDate);
    if (filtros?.endDate) parametros = parametros.set("endDate", filtros.endDate);
    if (filtros?.category) parametros = parametros.set("category", filtros.category);
    if (filtros?.description) parametros = parametros.set("description", filtros.description);

    if (typeof filtros?.startValue === "number") {
      parametros = parametros.set("startValue", String(filtros.startValue));
    }

    if (typeof filtros?.endValue === "number") {
      parametros = parametros.set("endValue", String(filtros.endValue));
    }

    return firstValueFrom(
      this.http.get<any>(`${this.api}/operation/allValues`, { params: parametros })
    ).then((resposta) => {
      // Ajuste este trecho se o backend retornar outro formato
      const valor =
        resposta?.total ??
        resposta?.value ??
        resposta?.data ??
        resposta;

      const numero = typeof valor === "number" ? valor : Number(valor);
      return isNaN(numero) ? 0 : numero;
    });
  }

}
