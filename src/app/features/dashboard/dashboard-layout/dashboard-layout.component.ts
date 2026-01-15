import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";

import { VisibilityService } from "../../../core/service/visibility.service";
import { TransactionService } from "../../../core/service/transaction.service";
import { FiltersService, TipoTx } from "../../../core/service/filters.service";

type SearchKind = "categoria" | "tipo" | "valor";

@Component({
  selector: "app-dashboard-layout",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./dashboard-layout.component.html",
  styleUrls: ["./dashboard-layout.component.scss"],
})
export class DashboardLayoutComponent {
  mobileNavOpen = false;

  tipoBusca: SearchKind = "categoria";
  textoBusca = "";

  valorMin?: number;
  valorMax?: number;

  constructor(
    public visibility: VisibilityService,
    private transactionService: TransactionService,
    private filters: FiltersService,
    private router: Router
  ) {}

  alternarNavMobile(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  fecharNavMobile(): void {
    this.mobileNavOpen = false;
  }

  abrirTransacao(): void {
    this.transactionService.open();
  }

  onTipoBuscaChange(): void {
    // evita emitir lixo quando troca o tipo
    this.textoBusca = "";
    this.valorMin = undefined;
    this.valorMax = undefined;
  }

  executarBusca(): void {
    // categoria
    if (this.tipoBusca === "categoria") {
      const cat = this.textoBusca.trim();
      if (!cat) return;
      this.filters.emit({ kind: "categoria", value: cat, mode: "toggle" });
      return;
    }

    // tipo
    if (this.tipoBusca === "tipo") {
      const raw = this.textoBusca.trim().toLowerCase();
      const tipo: TipoTx | null =
        raw === "entrada" ? "entrada" :
        raw === "saida" || raw === "saída" ? "saida" :
        null;

      if (!tipo) return;
      this.filters.emit({ kind: "tipo", value: tipo, mode: "toggle" });
      return;
    }

    // valor
    const min = this.valorMin;
    const max = this.valorMax;

    if (min == null && max == null) return;
    if (min != null && max != null && min > max) return;

    this.filters.emit({ kind: "valor", value: { min, max }, mode: "toggle" });
  }

  limparFiltros(): void {
    this.filters.emit({ kind: "limparTudo" });
    this.textoBusca = "";
    this.valorMin = undefined;
    this.valorMax = undefined;
  }

  aplicarMesAtual(): void {
    this.filters.emit({ kind: "mesAtual" });
  }

  logout(): void {
    // limpa tudo (você salva token em local OU session)
    localStorage.clear();
    sessionStorage.clear();

    // fecha menu mobile se estiver aberto
    this.mobileNavOpen = false;

    // volta pro início (vai cair no redirect para auth/login)
    this.router.navigateByUrl("/");
  }
}
