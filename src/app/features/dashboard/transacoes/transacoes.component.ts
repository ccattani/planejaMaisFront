import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";

import { ServicesService } from "../../../core/service/services.service";
import { TransactionService } from "../../../core/service/transaction.service";
import { Transaction } from "../../../shared/models/interfaces/transaction";

type UiTx = Transaction & {
  groupLabel: string;
  tags: string[];
  icon: string;
};

@Component({
  selector: "app-transacoes",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./transacoes.component.html",
  styleUrls: ["./transacoes.component.scss"],
})
export class TransacoesComponent implements OnInit {
  txs: UiTx[] = [];

  totalLabel = "Total transações: 0";
  totalValor = "+R$ 0";

  carregando = false;

  constructor(
    private services: ServicesService,
    private router: Router,
    private txModal: TransactionService // só pra mandar abrir o modal no Home
  ) {}

  async ngOnInit(): Promise<void> {
    await this.carregarTodas();
  }

  async carregarTodas(): Promise<void> {
    this.carregando = true;
    try {
      const resposta: any = await this.services.getAllTransactions();
      const lista = Array.isArray(resposta) ? resposta : resposta?.data ?? [];

      this.txs = this.mapToUiTx(lista);

      this.totalLabel = `Total transações: ${this.txs.length}`;
      const total = this.txs.reduce((acc, t) => acc + (t.numeric ?? 0), 0);
      this.totalValor = this.formatarMoedaComSinal(total);
    } catch (e) {
      console.error("Erro ao buscar transações", e);
    } finally {
      this.carregando = false;
    }
  }

  editar(tx: UiTx): void {
    // Sua decisão: modal só no Home.
    // Então: manda pro Home e abre modal preenchido via serviço.
    this.router.navigateByUrl("/home");
    this.txModal.open({
      desc: tx.desc,
      value: tx.value, // você já trata +/-
      category: tx.category ?? "",
      // se você usa index no Home, melhor usar id no form
      id: tx.id,
    } as any);
  }

  async excluir(tx: UiTx): Promise<void> {
    if (!tx.id) {
      console.error("Sem id: não dá para excluir com segurança.");
      return;
    }

    const backup = [...this.txs];
    this.txs = this.txs.filter((x) => x !== tx);

    try {
      await this.services.deleteExpense(tx.id);
    } catch (e) {
      console.error("Erro ao excluir (API)", e);
      this.txs = backup;
    }

    this.totalLabel = `Total transações: ${this.txs.length}`;
    const total = this.txs.reduce((acc, t) => acc + (t.numeric ?? 0), 0);
    this.totalValor = this.formatarMoedaComSinal(total);
  }

  trackById(_: number, item: UiTx): string {
    return item.id ?? item.desc + item.value;
  }

  // ====== mapeamento UI ======
  private mapToUiTx(lista: any[]): UiTx[] {
    const agora = new Date();
    const hojeKey = this.dateKey(agora);
    const ontem = new Date(agora);
    ontem.setDate(agora.getDate() - 1);
    const ontemKey = this.dateKey(ontem);

    return (lista as any[]).map((item) => {
      const valor: number = item.value ?? 0;
      const descricao: string = item.description ?? item.desc ?? "Transação";
      const id: string | undefined = item.id ?? item._id ?? item.transactionId;

      const dt = item.date ? new Date(item.date) : new Date();
      const key = this.dateKey(dt);

      const groupLabel =
        key === hojeKey ? "Hoje" : key === ontemKey ? "Ontem" : this.formatarDataCurta(dt);

      const category = (item.category ?? "").trim();

      return {
        id,
        desc: descricao,
        category,
        numeric: valor,
        value: this.formatarMoedaComSinal(valor),
        groupLabel,
        tags: this.tagsFrom(category),
        icon: this.iconFrom(category, descricao, valor),
      } as UiTx;
    });
  }

  private tagsFrom(category: string): string[] {
    if (!category) return [];
    const c = category.toLowerCase();
    if (c.includes("alim")) return ["Alimentação"];
    if (c.includes("saud")) return ["Saúde"];
    if (c.includes("transf")) return ["Transferência"];
    return [category];
  }

  private iconFrom(category: string, desc: string, valor: number): string {
    const c = (category ?? "").toLowerCase();
    const d = (desc ?? "").toLowerCase();
    if (d.includes("pix") || c.includes("transf")) return "📤";
    if (c.includes("alim") || d.includes("merc")) return "🛒";
    if (c.includes("saud") || d.includes("farm")) return "💊";
    if (d.includes("sal") || valor > 1000) return "💰";
    return "🧾";
  }

  private dateKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  private formatarDataCurta(d: Date): string {
    const dia = d.getDate();
    const mes = d.toLocaleDateString("pt-BR", { month: "long" });
    return `${dia} ${mes.charAt(0).toUpperCase() + mes.slice(1)}`;
  }

  private formatarMoedaComSinal(valor: number): string {
    const arredondado = Math.round(valor);
    const sinal = arredondado < 0 ? "-" : "+";
    return sinal + "R$ " + new Intl.NumberFormat("pt-BR").format(Math.abs(arredondado));
  }
}
