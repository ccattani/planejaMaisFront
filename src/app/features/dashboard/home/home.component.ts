import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { TransacoesComponent } from "../transacoes/transacoes.component";
import { VisibilityService } from "../../../core/service/visibility.service";
import { ServicesService } from "../../../core/service/services.service";
import { Transaction } from "../../../shared/models/interfaces/transaction";

type ChaveKpi = "saldoTotal" | "metaMensal";

type KpiConfig = {
  chave: ChaveKpi;
  titulo: string;
  icone: string;
  editavel: boolean;
};

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule, TransacoesComponent],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit {
  saldoTotal = "R$ 0";
  metaMensal = "R$ 0";

  kpis: KpiConfig[] = [
    { chave: "saldoTotal", titulo: "Saldo total", icone: "💳", editavel: false },
    { chave: "metaMensal", titulo: "Meta de guardar", icone: "🎯", editavel: true },
  ];

  editing: Record<ChaveKpi, boolean> = {
    saldoTotal: false,
    metaMensal: false,
  };

  editValues: Record<ChaveKpi, string> = {
    saldoTotal: this.saldoTotal,
    metaMensal: this.metaMensal,
  };

  transactions: Transaction[] = [];

  private readonly chaveStorageMetaMensal = "planejaMais_metaMensal";

  constructor(
    public visibility: VisibilityService,
    private services: ServicesService
  ) {}

  async ngOnInit(): Promise<void> {
    this.carregarMetaMensalDoStorage();
    await Promise.all([
      this.carregarSaldoTotal(),
      this.carregarUltimasTransacoes(),
    ]);
  }

  private async carregarSaldoTotal(): Promise<void> {
    try {
      const saldoTotalNumero = await this.services.getSomatorioLancamentos();
      this.saldoTotal = this.formatarMoedaSemSinal(saldoTotalNumero);
      this.editValues.saldoTotal = this.saldoTotal;
    } catch (erro) {
      console.error("Erro ao buscar saldo total (somatório)", erro);
    }
  }

  private async carregarUltimasTransacoes(): Promise<void> {
    try {
      const resposta: any = await this.services.getAllTransactions();
      const lista = Array.isArray(resposta) ? resposta : resposta?.data ?? [];

      const ultimasCinco = (lista as any[]).slice(0, 5);

      this.transactions = ultimasCinco.map((item) => {
        const valor: number = item.value ?? 0;
        const descricao: string = item.description ?? item.desc ?? "Transação";
        const id: string | undefined = item.id ?? item._id ?? item.transactionId;

        return {
          id,
          desc: descricao,
          category: item.category,
          numeric: valor,
          value: this.formatarMoedaComSinal(valor),
        } as Transaction;
      });
    } catch (erro) {
      console.error("Erro ao buscar últimas transações", erro);
    }
  }

  obterValorKpi(chave: ChaveKpi): string {
    if (chave === "saldoTotal") return this.saldoTotal;
    return this.metaMensal;
  }

  podeEditarKpi(chave: ChaveKpi): boolean {
    const config = this.kpis.find((kpi) => kpi.chave === chave);
    return config?.editavel === true;
  }

  iniciarEdicao(chave: ChaveKpi): void {
    if (!this.podeEditarKpi(chave)) return;
    this.editValues[chave] = this.obterValorKpi(chave);
    this.editing[chave] = true;
  }

  salvarEdicao(chave: ChaveKpi): void {
    if (!this.podeEditarKpi(chave)) return;

    if (chave === "metaMensal") {
      this.metaMensal = this.editValues.metaMensal;
      localStorage.setItem(this.chaveStorageMetaMensal, this.metaMensal);
    }

    this.editing[chave] = false;
  }

  cancelarEdicao(chave: ChaveKpi): void {
    this.editValues[chave] = this.obterValorKpi(chave);
    this.editing[chave] = false;
  }

  private carregarMetaMensalDoStorage(): void {
    const valorSalvo = localStorage.getItem(this.chaveStorageMetaMensal);
    if (valorSalvo) {
      this.metaMensal = valorSalvo;
      this.editValues.metaMensal = valorSalvo;
      return;
    }

    this.metaMensal = "R$ 4.000";
    this.editValues.metaMensal = this.metaMensal;
    localStorage.setItem(this.chaveStorageMetaMensal, this.metaMensal);
  }

  // Recebe do componente de transações quando criou/alterou/excluiu.
  // Aqui eu faço o mínimo: atualiza lista local e atualiza o saldo local com base no numeric.
  // Se você editar/excluir, precisa mandar um evento apropriado (ver observação abaixo).
  receberTransacaoFilha(transacao: Transaction): void {
    const valorAssinado = typeof transacao.numeric === "number" ? transacao.numeric : 0;

    this.transactions = [transacao, ...this.transactions].slice(0, 5);

    const saldoAtual = this.converterMoedaParaNumero(this.saldoTotal);
    this.saldoTotal = this.formatarMoedaSemSinal(saldoAtual + valorAssinado);
    this.editValues.saldoTotal = this.saldoTotal;
  }

  private converterMoedaParaNumero(valorStr: string): number {
    if (!valorStr) return 0;

    const negativo = valorStr.includes("-");
    let valorLimpo = valorStr.replace(/[R$+\-\s]/g, "");
    valorLimpo = valorLimpo.replace(/\./g, "");
    valorLimpo = valorLimpo.replace(/,/g, ".");

    const numero = Number(valorLimpo);
    if (Number.isNaN(numero)) return 0;

    return negativo ? -numero : numero;
  }

  private formatarMoedaSemSinal(valor: number): string {
    const arredondado = Math.round(valor);
    return "R$ " + new Intl.NumberFormat("pt-BR").format(arredondado);
  }

  private formatarMoedaComSinal(valor: number): string {
    const arredondado = Math.round(valor);
    const sinal = arredondado < 0 ? "-" : "+";
    return sinal + "R$ " + new Intl.NumberFormat("pt-BR").format(Math.abs(arredondado));
  }
}
