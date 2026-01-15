import { Component, OnInit, OnDestroy, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { Subject, filter, takeUntil } from "rxjs";

import { VisibilityService } from "../../../core/service/visibility.service";
import { ServicesService } from "../../../core/service/services.service";
import {
  FiltersService,
  FilterPatch,
} from "../../../core/service/filters.service";

import { Transaction } from "../../../shared/models/interfaces/transaction";
import { Router } from "@angular/router";

// IMPORT DO SEU MODAL (você vai criar no shared)
// ajuste o caminho conforme a pasta que você escolher no shared
import {
  TxModalComponent,
  TxModalValue,
} from "../../../shared/components/tx-modal/tx-modal.component";

type UiTx = Transaction & {
  groupLabel: string;
  tags: string[];
  icon: string;
  dateISO?: string;
};

type TipoTx = "entrada" | "saida";
type RangeValor = { min?: number; max?: number };

// evento emitido pelo <app-tx-modal (saved)="onTxSaved($event)">
type TxSavedEvent = {
  mode: "create" | "edit";
  tx: Transaction; // precisa ter pelo menos: id?, desc, category?, numeric, value
  dateISO?: string;
};

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule, TxModalComponent],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(TxModalComponent) txModal!: TxModalComponent;

  // ====== FILTROS (labels) ======
  mesLabel = "Janeiro";

  get filtroCategoriaLabel(): string {
    return this.filtroCategorias.length
      ? this.filtroCategorias.join(", ")
      : "Todas";
  }

  get filtroTipoLabel(): string {
    if (!this.filtroTipos.length) return "Todos";
    const labels = this.filtroTipos.map((t) =>
      t === "entrada" ? "Entrada" : "Saída"
    );
    return labels.join(", ");
  }

  get filtroValorLabel(): string {
    if (!this.filtroValores.length) return "--";
    return this.filtroValores
      .map((r) => {
        if (r.min == null && r.max != null) return `Até ${r.max}`;
        if (r.min != null && r.max == null) return `${r.min}+`;
        if (r.min != null && r.max != null) return `${r.min}-${r.max}`;
        return "--";
      })
      .join(", ");
  }

  // ====== FILTROS (estado real multi) ======
  private filtroMes: { start: Date; end: Date } | null = null;

  filtroCategorias: string[] = [];
  filtroTipos: TipoTx[] = [];
  filtroValores: RangeValor[] = [];

  // ====== KPIs ======
  saldoTotal = "R$ 0";
  gastoNoMes = "R$ 0";

  // ====== LISTA ======
  txsAll: UiTx[] = [];
  txs: UiTx[] = [];

  totalUltimasLabel = "Total transações: 0";
  totalUltimasValor = "+R$ 0";

  // ====== META (barra do saldo) ======
  metaProgress = 0;

  // ====== METAS CRIADAS ======
  GOALS_KEY = "planeja_goals_v1";
  metasCriadas = 0;

  constructor(
    public visibility: VisibilityService,
    private services: ServicesService,
    private filtersService: FiltersService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.filtersService.patch$
      .pipe(
        takeUntil(this.destroy$),
        filter((p): p is FilterPatch => p !== null)
      )
      .subscribe((patch) => this.aplicarPatch(patch));

    this.definirFiltroMesAtual();

    await Promise.all([this.carregarSaldoTotal(), this.carregarTransacoes()]);

    this.aplicarFiltros();
    this.recalcularDashLocal();
    this.carregarMetasCriadas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // PATCHES VINDOS DO DASHBOARD
  // =========================
  private aplicarPatch(patch: FilterPatch): void {
    switch (patch.kind) {
      case "categoria":
        this.patchCategoria(patch.value, patch.mode ?? "toggle");
        break;

      case "tipo":
        this.patchTipo(patch.value, patch.mode ?? "toggle");
        break;

      case "valor":
        this.patchValor(patch.value, patch.mode ?? "toggle");
        break;

      case "mesAtual":
        this.definirFiltroMesAtual();
        break;

      case "limparTudo":
        this.limparTodosFiltros();
        return;
    }

    this.aplicarFiltros();
    this.recalcularDashLocal();
  }

  private patchCategoria(
    value: string,
    mode: "toggle" | "set" | "clear"
  ): void {
    const cat = value.trim();
    if (!cat) return;

    if (mode === "clear") {
      this.filtroCategorias = [];
      return;
    }
    if (mode === "set") {
      this.filtroCategorias = [cat];
      return;
    }

    const idx = this.filtroCategorias.findIndex(
      (c) => c.toLowerCase() === cat.toLowerCase()
    );
    if (idx >= 0) this.filtroCategorias.splice(idx, 1);
    else this.filtroCategorias.push(cat);
  }

  private patchTipo(value: TipoTx, mode: "toggle" | "set" | "clear"): void {
    if (mode === "clear") {
      this.filtroTipos = [];
      return;
    }
    if (mode === "set") {
      this.filtroTipos = [value];
      return;
    }

    const idx = this.filtroTipos.indexOf(value);
    if (idx >= 0) this.filtroTipos.splice(idx, 1);
    else this.filtroTipos.push(value);
  }

  private patchValor(
    value: RangeValor,
    mode: "toggle" | "set" | "clear"
  ): void {
    const min = value.min;
    const max = value.max;

    if (mode === "clear") {
      this.filtroValores = [];
      return;
    }
    if (mode === "set") {
      this.filtroValores = [{ min, max }];
      return;
    }

    const idx = this.filtroValores.findIndex(
      (r) => r.min === min && r.max === max
    );
    if (idx >= 0) this.filtroValores.splice(idx, 1);
    else this.filtroValores.push({ min, max });
  }

  // =========================
  // FILTROS (UI local)
  // =========================
  categoriaAtiva(cat: string): boolean {
    return this.filtroCategorias.includes(cat);
  }

  toggleCategoria(cat: string): void {
    const i = this.filtroCategorias.indexOf(cat);
    if (i >= 0) this.filtroCategorias.splice(i, 1);
    else this.filtroCategorias.push(cat);

    this.aplicarFiltros();
    this.recalcularDashLocal();
  }

  limparFiltroCategoria(): void {
    this.filtroCategorias = [];
    this.aplicarFiltros();
    this.recalcularDashLocal();
  }

  tipoAtivo(tipo: TipoTx): boolean {
    return this.filtroTipos.includes(tipo);
  }

  toggleTipo(tipo: TipoTx): void {
    const i = this.filtroTipos.indexOf(tipo);
    if (i >= 0) this.filtroTipos.splice(i, 1);
    else this.filtroTipos.push(tipo);

    this.aplicarFiltros();
    this.recalcularDashLocal();
  }

  limparFiltroTipo(): void {
    this.filtroTipos = [];
    this.aplicarFiltros();
    this.recalcularDashLocal();
  }

  valorAtivo(min?: number, max?: number): boolean {
    return this.filtroValores.some((r) => r.min === min && r.max === max);
  }

  toggleValor(min?: number, max?: number): void {
    const idx = this.filtroValores.findIndex(
      (r) => r.min === min && r.max === max
    );
    if (idx >= 0) this.filtroValores.splice(idx, 1);
    else this.filtroValores.push({ min, max });

    this.aplicarFiltros();
    this.recalcularDashLocal();
  }

  limparFiltroValor(): void {
    this.filtroValores = [];
    this.aplicarFiltros();
    this.recalcularDashLocal();
  }

  limparTodosFiltros(): void {
    this.definirFiltroMesAtual();
    this.filtroCategorias = [];
    this.filtroTipos = [];
    this.filtroValores = [];
    this.aplicarFiltros();
    this.recalcularDashLocal();
  }

  private definirFiltroMesAtual(): void {
    const agora = new Date();
    const start = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    const end = new Date(
      agora.getFullYear(),
      agora.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    this.filtroMes = { start, end };

    let mes = agora.toLocaleDateString("pt-BR", { month: "long" });
    mes = mes.charAt(0).toUpperCase() + mes.slice(1);
    this.mesLabel = mes;
  }

  private aplicarFiltros(): void {
    let lista = [...this.txsAll];

    // mês
    if (this.filtroMes) {
      const s = this.filtroMes.start.getTime();
      const e = this.filtroMes.end.getTime();
      lista = lista.filter((tx) => {
        const t = new Date(tx.dateISO ?? 0).getTime();
        return t >= s && t <= e;
      });
    }

    // categorias (OR)
    if (this.filtroCategorias.length) {
      const cats = this.filtroCategorias.map((c) => c.toLowerCase());
      lista = lista.filter((tx) => {
        const c = (tx.category ?? "").toLowerCase();
        return cats.some((wanted) => c.includes(wanted));
      });
    }

    // tipos (OR)
    if (this.filtroTipos.length) {
      lista = lista.filter((tx) => {
        const n = tx.numeric ?? 0;
        return (
          (n > 0 && this.filtroTipos.includes("entrada")) ||
          (n < 0 && this.filtroTipos.includes("saida"))
        );
      });
    }

    // valores (ranges OR, usando abs)
    if (this.filtroValores.length) {
      lista = lista.filter((tx) => {
        const v = Math.abs(tx.numeric ?? 0);
        return this.filtroValores.some((r) => {
          const okMin = r.min == null || v >= r.min;
          const okMax = r.max == null || v <= r.max;
          return okMin && okMax;
        });
      });
    }

    // home: corta
    this.txs = lista.slice(0, 12);

    // header baseado no TOTAL FILTRADO
    this.totalUltimasLabel = `Total transações: ${lista.length}`;
    const total = lista.reduce((acc, t) => acc + (t.numeric ?? 0), 0);
    this.totalUltimasValor = this.formatarMoedaComSinal(total);
  }

  // =========================
  // MODAL (AGORA É COMPONENTE SHARED)
  // =========================
  abrirNovaTransacao(): void {
    if (!this.txModal) return;
    this.txModal.open();
  }

  async onTxSaved(v: TxModalValue): Promise<void> {
    const desc = (v.desc ?? "").trim() || "Transação";
    const category = (v.category ?? "").trim() || desc;

    const valorNum = this.parseValorMoeda(v.value);
    if (valorNum <= 0) return;

    const signed = v.type === "saida" ? -valorNum : valorNum;

    // monta payload do backend (mesmo padrão que você já usa no salvarTransacao antigo)
    const agora = new Date().toISOString();
    const payload = {
      description: desc,
      value: signed,
      category,
      date: agora,
      updatedAt: agora,
    };

    // this.salvando = true;

    try {
      // ✅ CHAMA API CREATE
      const res: any = await this.services.createExpense(payload);

      // tenta extrair id de qualquer formato
      const id = String(
        res?.id ??
          res?._id ??
          res?.transactionId ??
          res?.data?.id ??
          res?.data?._id ??
          ""
      );

      // cria tx local com id retornado
      const tx: Transaction = {
        id: id || undefined,
        desc,
        category,
        numeric: signed,
        value: this.formatarMoedaComSinal(signed),
      };

      const ui = this.toUiTx(tx, agora);

      // adiciona no topo
      this.txsAll = [ui, ...this.txsAll];

      // atualiza saldo local
      const saldoAtual = this.converterMoedaParaNumero(this.saldoTotal);
      this.saldoTotal = this.formatarMoedaSemSinal(saldoAtual + signed);

      this.aplicarFiltros();
      this.recalcularDashLocal();
    } catch (e) {
      console.error("Erro ao criar transação", e);
    } finally {
      // this.salvando = false;
    }
  }

  private parseValorMoeda(v: string): number {
    if (!v) return 0;
    let s = v.replace(/R\$|\s/g, "");
    s = s.replace(/\./g, "");
    s = s.replace(/,/g, ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  // =========================
  // API
  // =========================
  private async carregarSaldoTotal(): Promise<void> {
    try {
      const saldo = await this.services.getSomatorioLancamentos();
      this.saldoTotal = this.formatarMoedaSemSinal(saldo);
    } catch (e) {
      console.error("Erro ao buscar saldo total", e);
    }
  }

  private async carregarTransacoes(): Promise<void> {
    try {
      const resposta: any = await this.services.getAllTransactions();
      const lista = Array.isArray(resposta) ? resposta : resposta?.data ?? [];

      const normalizadas: UiTx[] = (lista as any[]).map((item) => {
        const valor: number = item.value ?? 0;
        const desc: string = item.description ?? item.desc ?? "Transação";
        const id: string | undefined =
          item.id ?? item._id ?? item.transactionId;
        const iso = item.date ? String(item.date) : new Date().toISOString();

        const base: Transaction = {
          id,
          desc,
          category: (item.category ?? "").trim(),
          numeric: valor,
          value: this.formatarMoedaComSinal(valor),
        };

        return this.toUiTx(base, iso);
      });

      normalizadas.sort((a, b) => {
        const da = new Date(a.dateISO ?? 0).getTime();
        const db = new Date(b.dateISO ?? 0).getTime();
        return db - da;
      });

      this.txsAll = normalizadas;
    } catch (e) {
      console.error("Erro ao buscar transações", e);
      this.txsAll = [];
    }
  }

  // =========================
  // DASH LOCAL
  // =========================
  clampPercent(value: number | null | undefined): number {
    const v = typeof value === "number" ? value : 0;
    return Math.max(0, Math.min(100, v));
  }

  private recalcularDashLocal(): void {
    const listaMes = this.filtroMes
      ? this.txsAll.filter((tx) => {
          const t = new Date(tx.dateISO ?? 0).getTime();
          return (
            t >= this.filtroMes!.start.getTime() &&
            t <= this.filtroMes!.end.getTime()
          );
        })
      : this.txsAll;

    const gastos = listaMes.reduce((acc, t) => {
      const n = t.numeric ?? 0;
      return acc + (n < 0 ? Math.abs(n) : 0);
    }, 0);

    this.gastoNoMes = "-" + this.formatarMoedaSemSinal(gastos);

    // metaProgress agora só usa “saldoTotal” como referência (sem meta mensal)
    // Se você quiser uma barra diferente aqui, você define.
    this.metaProgress = 0;
  }

  // =========================
  // HELPERS UI
  // =========================
  private toUiTx(tx: Transaction, dateISO: string): UiTx {
    const dt = new Date(dateISO);
    const groupLabel = this.groupLabelFromDate(dt);

    const category = (tx.category ?? "").trim();
    const numeric = tx.numeric ?? 0;

    return {
      ...tx,
      dateISO,
      groupLabel,
      tags: this.tagsFrom(category),
      icon: this.iconFrom(category, tx.desc, numeric),
    };
  }

  private groupLabelFromDate(dt: Date): string {
    const agora = new Date();
    const hojeKey = this.dateKey(agora);

    const ontem = new Date(agora);
    ontem.setDate(agora.getDate() - 1);
    const ontemKey = this.dateKey(ontem);

    const key = this.dateKey(dt);
    if (key === hojeKey) return "Hoje";
    if (key === ontemKey) return "Ontem";
    return this.formatarDataCurta(dt);
  }

  private tagsFrom(category: string): string[] {
    if (!category) return [];
    const c = category.toLowerCase();
    if (c.includes("alim")) return ["Alimentação"];
    if (c.includes("saud")) return ["Saúde"];
    if (c.includes("transf") || c.includes("pix")) return ["Transferência"];
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

  private converterMoedaParaNumero(valorStr: string): number {
    if (!valorStr) return 0;
    const negativo = valorStr.includes("-");
    let s = valorStr.replace(/[R$+\-\s]/g, "");
    s = s.replace(/\./g, "");
    s = s.replace(/,/g, ".");
    const n = Number(s);
    if (Number.isNaN(n)) return 0;
    return negativo ? -n : n;
  }

  private formatarMoedaSemSinal(valor: number): string {
    const arred = Math.round(valor);
    return "R$ " + new Intl.NumberFormat("pt-BR").format(arred);
  }

  private formatarMoedaComSinal(valor: number): string {
    const arred = Math.round(valor);
    const sinal = arred < 0 ? "-" : "+";
    return (
      sinal + "R$ " + new Intl.NumberFormat("pt-BR").format(Math.abs(arred))
    );
  }

  trackById(_: number, item: UiTx): string {
    return item.id ?? item.desc + item.value + (item.dateISO ?? "");
  }

  // =========================
  // METAS CRIADAS
  // =========================
  get metasBarPercent(): number {
    const max = 10;
    return Math.min(100, Math.round((this.metasCriadas / max) * 100));
  }

  irParaMetas(): void {
    // ajuste a rota real do seu app
    this.router.navigate(["/goals"]);
  }

  private carregarMetasCriadas(): void {
    try {
      const raw = localStorage.getItem(this.GOALS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      this.metasCriadas = Array.isArray(list) ? list.length : 0;
    } catch {
      this.metasCriadas = 0;
    }
  }
}
