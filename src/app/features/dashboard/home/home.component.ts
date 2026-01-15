import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { VisibilityService } from "../../../core/service/visibility.service";
import { ServicesService } from "../../../core/service/services.service";
import {
  Transaction,
  TransactionPayload,
} from "../../../shared/models/interfaces/transaction";
import { TransactionService } from "../../../core/service/transaction.service";
import { TransacoesComponent } from "../transacoes/transacoes.component";

type ChaveKpi = "saldoTotal" | "metaMensal";

type KpiConfig = {
  chave: ChaveKpi;
  titulo: string;
  icone: string;
  editavel: boolean;
};

type UiTx = Transaction & {
  groupLabel: string;
  tags: string[];
  icon: string;
};

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit {
  // filtros UI (só visual por enquanto)
  mesLabel = "Janeiro";
  filtroCategoria = "Todas";
  filtroTipo = "Todos";
  filtroValor = "--";
  filtroCustom = "Custom";

  // KPIs
  saldoTotal = "R$ 0";
  metaMensal = "R$ 0";
  gastoNoMes = "R$ 0";

  kpis: KpiConfig[] = [
    {
      chave: "saldoTotal",
      titulo: "Saldo total",
      icone: "💳",
      editavel: false,
    },
    {
      chave: "metaMensal",
      titulo: "Meta de guardar",
      icone: "🎯",
      editavel: true,
    },
  ];

  editing: Record<ChaveKpi, boolean> = {
    saldoTotal: false,
    metaMensal: false,
  };

  editValues: Record<ChaveKpi, string> = {
    saldoTotal: this.saldoTotal,
    metaMensal: this.metaMensal,
  };

  private readonly chaveStorageMetaMensal = "planejaMais_metaMensal";

  // lista rica da Home (agrupada)
  txs: UiTx[] = [];

  // cabeçalho da lista
  totalUltimasLabel = "Total transações: 0";
  totalUltimasValor = "+R$ 0";

  // meta/progresso
  metaProgress = 0; // 0-100
  metaRestante = "R$ 0";

  // insights (placeholder por enquanto)
  insightTopCategoria = "Alimentação";
  insightTopDelta = "+18%";

  modalNovaTransacao = false;
  salvando = false;

  modoEdicao = false;
  idEmEdicao: string | null = null;

  form: {
    desc: string;
    category: string;
    value: string;
    type: "entrada" | "saida";
  } = {
    desc: "",
    category: "",
    value: "",
    type: "saida",
  };

  constructor(
    public visibility: VisibilityService,
    private services: ServicesService,
    private txModal: TransactionService
  ) {}

  async ngOnInit(): Promise<void> {
    this.carregarMetaMensalDoStorage();

    await Promise.all([
      this.carregarSaldoTotal(),
      this.carregarUltimasTransacoes(),
    ]);

    this.recalcularDashLocal();
  }

  abrirNovaTransacao(): void {
    this.modoEdicao = false;
    this.idEmEdicao = null;
    this.form = { desc: "", category: "", value: "", type: "saida" };
    this.modalNovaTransacao = true;
  }

  fecharModalNovaTransacao(): void {
    this.modalNovaTransacao = false;
  }

  private parseValorMoeda(v: string): number {
    if (!v) return 0;
    let s = v.replace(/R\$|\s/g, "");
    s = s.replace(/\./g, "");
    s = s.replace(/,/g, ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  private formatMoedaComSinal(valor: number): string {
    const arred = Math.round(valor);
    const sinal = arred < 0 ? "-" : "+";
    return (
      sinal + "R$ " + new Intl.NumberFormat("pt-BR").format(Math.abs(arred))
    );
  }

  private formatMoedaSemSinal(valor: number): string {
    const arred = Math.round(valor);
    return "R$ " + new Intl.NumberFormat("pt-BR").format(arred);
  }

  private montarPayload(
    descricao: string,
    valorAssinado: number,
    categoria: string
  ): TransactionPayload {
    const agora = new Date().toISOString();
    return {
      description: descricao,
      value: valorAssinado,
      category: categoria,
      date: agora,
      updatedAt: agora,
    };
  }

  async salvarTransacao(): Promise<void> {
    const desc = this.form.desc.trim() || "Transação";
    const category = this.form.category.trim() || desc;

    const valorNum = this.parseValorMoeda(this.form.value);
    if (valorNum <= 0) {
      this.fecharModalNovaTransacao();
      return;
    }

    const valorAssinado = this.form.type === "saida" ? -valorNum : valorNum;
    const payload = this.montarPayload(desc, valorAssinado, category);

    this.salvando = true;
    try {
      // ✅ Se você quer que /transactions seja só leitura, então aqui só cria.
      // Se futuramente quiser editar no home, você implementa update aqui também.
      const res: any = await this.services.createExpense(payload);
      const id = String(
        res?.id ??
          res?._id ??
          res?.transactionId ??
          res?.data?.id ??
          res?.data?._id ??
          ""
      );

      // atualiza UI local sem dar 3 GET
      const tx: Transaction = {
        id: id || undefined,
        desc,
        category,
        numeric: valorAssinado,
        value: this.formatMoedaComSinal(valorAssinado),
      };

      // lista rica (home) — joga pro topo
      this.inserirTxNaHome(tx);

      // KPIs locais (saldo)
      const saldoAtual = this.converterMoedaParaNumero(this.saldoTotal);
      this.saldoTotal = this.formatMoedaSemSinal(saldoAtual + valorAssinado);

      // recalcula progress/meta etc
      this.recalcularDashLocal();

      this.fecharModalNovaTransacao();
    } catch (e) {
      console.error("Erro ao criar transação", e);
    } finally {
      this.salvando = false;
    }
  }

  private inserirTxNaHome(tx: Transaction): void {
    const dt = new Date(); // agora
    const groupLabel = "Hoje";

    const category = (tx.category ?? "").trim();

    const ui = {
      ...tx,
      groupLabel,
      tags: this.tagsFrom(category),
      icon: this.iconFrom(category, tx.desc, tx.numeric ?? 0),
    } as UiTx;

    this.txs = [ui, ...this.txs].slice(0, 6);

    this.totalUltimasLabel = `Total transações: ${this.txs.length}`;
    const totalUltimas = this.txs.reduce((acc, t) => acc + (t.numeric ?? 0), 0);
    this.totalUltimasValor = this.formatMoedaComSinal(totalUltimas);
  }

  obterValorKpi(chave: ChaveKpi): string {
    return chave === "saldoTotal" ? this.saldoTotal : this.metaMensal;
  }

  podeEditarKpi(chave: ChaveKpi): boolean {
    const config = this.kpis.find((k) => k.chave === chave);
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
      this.recalcularDashLocal();
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

  private async carregarSaldoTotal(): Promise<void> {
    try {
      const saldoTotalNumero = await this.services.getSomatorioLancamentos();
      this.saldoTotal = this.formatarMoedaSemSinal(saldoTotalNumero);
      this.editValues.saldoTotal = this.saldoTotal;
    } catch (e) {
      console.error("Erro ao buscar saldo total", e);
    }
  }

  private async carregarUltimasTransacoes(): Promise<void> {
    try {
      const resposta: any = await this.services.getAllTransactions();
      const lista = Array.isArray(resposta) ? resposta : resposta?.data ?? [];

      const ultimas = (lista as any[]).slice(0, 6); // na imagem tem mais que 5, fica melhor

      const agora = new Date();
      const hojeKey = this.dateKey(agora);
      const ontem = new Date(agora);
      ontem.setDate(agora.getDate() - 1);
      const ontemKey = this.dateKey(ontem);

      this.txs = ultimas.map((item) => {
        const valor: number = item.value ?? 0;
        const descricao: string = item.description ?? item.desc ?? "Transação";
        const id: string | undefined =
          item.id ?? item._id ?? item.transactionId;

        const dt = item.date ? new Date(item.date) : new Date();
        const key = this.dateKey(dt);

        const groupLabel =
          key === hojeKey
            ? "Hoje"
            : key === ontemKey
            ? "Ontem"
            : this.formatarDataCurta(dt);

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

      // header
      this.totalUltimasLabel = `Total transações: ${this.txs.length}`;
      const totalUltimas = this.txs.reduce(
        (acc, t) => acc + (t.numeric ?? 0),
        0
      );
      this.totalUltimasValor = this.formatarMoedaComSinal(totalUltimas);
    } catch (e) {
      console.error("Erro ao buscar transações", e);
    }
  }

  clampPercent(value: number | null | undefined): number {
    const v = typeof value === "number" ? value : 0;
    return Math.max(0, Math.min(100, v));
  }

  // chamado quando criar/editar/excluir no modal (você já emite no TransacoesComponent)
  // aqui você escolhe: ou atualiza local, ou dá reload.
  async receberTransacaoFilha(): Promise<void> {
    // honesto: pra não dar bug de saldo divergente, recarrega só o necessário
    await Promise.all([
      this.carregarSaldoTotal(),
      this.carregarUltimasTransacoes(),
    ]);
    this.recalcularDashLocal();
  }

  private recalcularDashLocal(): void {
    const gastos = this.txs.reduce((acc, t) => {
      const n = t.numeric ?? 0;
      return acc + (n < 0 ? Math.abs(n) : 0);
    }, 0);

    this.gastoNoMes = "-" + this.formatarMoedaSemSinal(gastos);

    const saldo = this.converterMoedaParaNumero(this.saldoTotal);
    const meta = Math.max(0, this.converterMoedaParaNumero(this.metaMensal));
    const prog = meta > 0 ? Math.round((saldo / meta) * 100) : 0;

    this.metaProgress = this.clampPercent(prog);

    const restante = Math.max(0, meta - saldo);
    this.metaRestante = this.formatarMoedaSemSinal(restante);
  }
  // ===== Helpers =====
  private tagsFrom(category: string): string[] {
    if (!category) return [];
    // você pode sofisticar: mapear categorias em grupos
    if (category.toLowerCase().includes("alim")) return ["Alimentação"];
    if (category.toLowerCase().includes("saud")) return ["Saúde"];
    if (category.toLowerCase().includes("transf")) return ["Transferência"];
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
    // ex: 10 Janeiro
    const dia = d.getDate();
    const mes = d.toLocaleDateString("pt-BR", { month: "long" });
    return `${dia} ${mes.charAt(0).toUpperCase() + mes.slice(1)}`;
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
    return (
      sinal +
      "R$ " +
      new Intl.NumberFormat("pt-BR").format(Math.abs(arredondado))
    );
  }

  // útil pro *ngFor com agrupamento
  trackById(_: number, item: UiTx): string {
    return item.id ?? item.desc + item.value;
  }

  async onTxCriada(tx: Transaction): Promise<void> {
    // opção 1 (rápida e correta): recarregar o que precisa
    await Promise.all([
      this.carregarSaldoTotal(),
      this.carregarUltimasTransacoes(),
    ]);
    this.recalcularDashLocal();

    // opção 2 (mais leve): atualizar localmente sem GET
    // (aí você precisa garantir numeric etc)
  }
}
