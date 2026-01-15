import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { VisibilityService } from "../../../core/service/visibility.service";
import { TransactionService } from "../../../core/service/transaction.service";

@Component({
  selector: "app-dashboard-layout",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./dashboard-layout.component.html",
  styleUrls: ["./dashboard-layout.component.scss"],
})
export class DashboardLayoutComponent {
  mobileNavOpen = false;
  textoBusca = "";

  constructor(
    public visibility: VisibilityService,
    private transactionService: TransactionService
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

  executarBusca(): void {
    // Aqui você decide como quer distribuir a busca.
    // O mais simples: emitir o texto num service (BehaviorSubject)
    // e a tela de transações escuta e chama a API.
    // Por enquanto, deixa vazio pra não bagunçar seu fluxo.
    // console.log("Buscar:", this.textoBusca);
  }
}
