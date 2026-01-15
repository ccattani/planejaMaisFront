import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

import { RegisterPayload } from "../../shared/models/interfaces/register";
import { LoginPayload } from "../../shared/models/interfaces/login";
import { UpdatePayload } from "../../shared/models/interfaces/update";
import { TransactionPayload } from "../../shared/models/interfaces/transaction";
import { FiltrosSomatorioLancamentos } from "../../shared/models/interfaces/filtroSomatorio";
import { CreateGoalPayload } from "../../shared/models/interfaces/metas";

export type TipoTx = "entrada" | "saida";
export type RangeValor = { min?: number; max?: number };

export type TransactionFilterParams = {
  // Datas
  startDate?: string; // ISO
  endDate?: string;   // ISO

  // Texto
  category?: string;      // pode ser "Alimentação" ou "Alimentação,Saúde" se backend aceitar
  description?: string;

  // Tipo (se o backend aceitar)
  type?: TipoTx | TipoTx[];

  // Valor (se o backend aceitar)
  startValue?: number; // min
  endValue?: number;   // max

  // Se você quiser mandar ranges múltiplos, dá pra usar um formato string
  // Ex: "100-500|500-1000|-200" etc — depende do backend
  valueRange?: string;
};

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
    return firstValueFrom(this.http.get(`${this.api}/login/forgotPassword/${email}`));
  }

  newPassword(payload: { passwordHash: string }, token: string) {
    return firstValueFrom(
      this.http.post(`${this.api}/login/newPassword`, payload, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })
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
      this.http.get(`${this.api}/login/autenticateAccountEmail`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "text",
      })
    );
  }

  /**
   * Mantém compatibilidade: chama o endpoint sem parâmetros.
   * Se o backend filtrar por padrão, ok.
   */
  getAllTransactions() {
    return firstValueFrom(this.http.get(`${this.api}/expense/myExpenseByFilter`));
  }

  /**
   * NOVO: busca transações com filtros via query params.
   * Ajuste os nomes dos params se o backend usar outros.
   */
  getTransactionsByFilter(filtros?: TransactionFilterParams) {
    let params = new HttpParams();

    if (filtros?.startDate) params = params.set("startDate", filtros.startDate);
    if (filtros?.endDate) params = params.set("endDate", filtros.endDate);

    if (filtros?.category) params = params.set("category", filtros.category);
    if (filtros?.description) params = params.set("description", filtros.description);

    // valor (min/max)
    if (typeof filtros?.startValue === "number") {
      params = params.set("startValue", String(filtros.startValue));
    }
    if (typeof filtros?.endValue === "number") {
      params = params.set("endValue", String(filtros.endValue));
    }

    // tipo (entrada/saida)
    // Alguns backends aceitam repetição: type=entrada&type=saida
    // Outros aceitam csv: type=entrada,saida
    // Aqui vou mandar CSV (mais comum). Se seu backend for diferente, me fala e eu ajusto.
    if (filtros?.type) {
      const v = Array.isArray(filtros.type) ? filtros.type.join(",") : filtros.type;
      params = params.set("type", v);
    }

    // ranges múltiplos (se você implementar no backend)
    if (filtros?.valueRange) {
      params = params.set("valueRange", filtros.valueRange);
    }

    return firstValueFrom(
      this.http.get(`${this.api}/expense/myExpenseByFilter`, { params })
    );
  }

  createExpense(payload: TransactionPayload) {
    return firstValueFrom(this.http.post(`${this.api}/expense/create`, payload));
  }

  updateExpense(id: string, payload: TransactionPayload) {
    return firstValueFrom(this.http.patch(`${this.api}/expense/update/${id}`, payload));
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
      const valor =
        resposta?.total ??
        resposta?.value ??
        resposta?.data ??
        resposta;

      const numero = typeof valor === "number" ? valor : Number(valor);
      return isNaN(numero) ? 0 : numero;
    });
  }

    createGoal(payload: CreateGoalPayload) {
    // Se você já tem interceptor que injeta Authorization, isso é redundante,
    // mas aqui garante funcionar mesmo sem interceptor.
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token');

    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    return firstValueFrom(this.http.post(`${this.api}/goal/create`, payload, { headers }));
  }

  getMyGoals(year: number, month: number) {
    return firstValueFrom(
      this.http.get(`${this.api}/goal/myGoal/${year}/${month}`)
    );
  }
}
