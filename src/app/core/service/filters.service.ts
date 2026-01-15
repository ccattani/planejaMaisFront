import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export type TipoTx = "entrada" | "saida";
export type RangeValor = { min?: number; max?: number };

export type FilterPatch =
  | { kind: "categoria"; value: string; mode?: "toggle" | "set" | "clear" }
  | { kind: "tipo"; value: TipoTx; mode?: "toggle" | "set" | "clear" }
  | { kind: "valor"; value: RangeValor; mode?: "toggle" | "set" | "clear" }
  | { kind: "mesAtual" }
  | { kind: "limparTudo" };

@Injectable({ providedIn: "root" })
export class FiltersService {
  private readonly _patch$ = new BehaviorSubject<FilterPatch | null>(null);
  readonly patch$ = this._patch$.asObservable();

  emit(patch: FilterPatch) {
    this._patch$.next(patch);
  }
}
