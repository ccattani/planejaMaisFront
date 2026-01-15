import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Subject, filter, takeUntil } from "rxjs";

import { ServicesService } from "../../../core/service/services.service";
import { FiltersService, FilterPatch, TipoTx, RangeValor } from "../../../core/service/filters.service";
import { Transaction, TransactionPayload } from "../../../shared/models/interfaces/transaction";

import { TxModalComponent, TxModalValue } from "../../../shared/components/tx-modal/tx-modal.component";

type UiTx = Transaction & {
  groupLabel: string;
  tags: string[];
  icon: string;
  dateISO?: string;
};

@Component({
  selector: "app-transacoes",
  standalone: true,
  imports: [CommonModule, FormsModule, TxModalComponent],
  templateUrl: "./transacoes.component.html",
  styleUrls: ["./transacoes.component.scss"],
})
export class TransacoesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(TxModalComponent) txModal!: TxModalComponent;

  txsAll: UiTx[] = [];
  txs: UiTx[] = [];

  totalLabel = "Total transações: 0";
  totalValor = "+R$ 0";

  carregando = false;
  salvando = false;

  // filtros
  private filtroMes: { start: Date; end: Date } | null = null;
  filtroCategorias: string[] = [];
  filtroTipos: TipoTx[] = [];
  filtroValores: RangeValor[] = [];

  constructor(
    private services: ServicesService,
    private router: Router,
    private filtersService: FiltersService
  ) {}

  async ngOnInit(): Promise<void> {
    this.filtersService.patch$
      .pipe(
        takeUntil(this.destroy$),
        filter((p): p is FilterPatch => p !== null)
      )
      .subscribe((patch) => this.aplicarPatch(patch));

    this.definirFiltroMesAtual();
    await this.carregarTodas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async carregarTodas(): Promise<void> {
    this.carregando = true;
    try {
      const resposta: any = await this.services.getAllTransactions();
      const lista = Array.isArray(resposta) ? resposta : resposta?.data ?? [];

      this.txsAll = this.mapToUiTx(lista);
      this.aplicarFiltros();
    } catch (e) {
      console.error("Erro ao buscar transações", e);
      this.txsAll = [];
      this.txs = [];
      this.atualizarTotais(this.txs);
    } finally {
      this.carregando = false;
    }
  }

  // =========================
  // PATCHES
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
  }

  private patchCategoria(value: string, mode: "toggle" | "set" | "clear"): void {
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

    const idx = this.filtroCategorias.findIndex((c) => c.toLowerCase() === cat.toLowerCase());
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

  private patchValor(value: RangeValor, mode: "toggle" | "set" | "clear"): void {
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

    const idx = this.filtroValores.findIndex((r) => r.min === min && r.max === max);
    if (idx >= 0) this.filtroValores.splice(idx, 1);
    else this.filtroValores.push({ min, max });
  }

  private limparTodosFiltros(): void {
    this.definirFiltroMesAtual();
    this.filtroCategorias = [];
    this.filtroTipos = [];
    this.filtroValores = [];
    this.aplicarFiltros();
  }

  private definirFiltroMesAtual(): void {
    const agora = new Date();
    const start = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
    this.filtroMes = { start, end };
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

    // valores (ranges OR, abs)
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

    this.txs = lista;
    this.atualizarTotais(lista);
  }

  private atualizarTotais(lista: UiTx[]): void {
    this.totalLabel = `Total transações: ${lista.length}`;
    const total = lista.reduce((acc, t) => acc + (t.numeric ?? 0), 0);
    this.totalValor = this.formatarMoedaComSinal(total);
  }

  // =========================
  // AÇÕES
  // =========================
  editar(tx: UiTx): void {
    if (!this.txModal) return;

    this.txModal.open({
      id: tx.id,
      desc: tx.desc,
      category: tx.category ?? "",
      // tx.value é "+R$ 1.000" ou "-R$ 50" no seu UI. O modal quer "230,50" etc.
      // então convertemos para "1000" simples:
      value: String(Math.abs(tx.numeric ?? 0)),
      type: (tx.numeric ?? 0) >= 0 ? "entrada" : "saida",
    });
  }

  async onTxSaved(v: TxModalValue): Promise<void> {
    if (this.salvando) return;
    this.salvando = true;

    const desc = (v.desc ?? "").trim() || "Transação";
    const category = (v.category ?? "").trim() || desc;

    const valorNum = this.parseValorMoeda(v.value);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      this.salvando = false;
      return;
    }

    const signed = v.type === "saida" ? -Math.abs(valorNum) : Math.abs(valorNum);

    // payload do backend (ajusta se seu backend exigir outro shape)
    const agora = new Date().toISOString();
    const payload: TransactionPayload = {
      description: desc,
      value: signed,
      category,
      date: agora,
      updatedAt: agora,
    };

    try {
      // ✅ EDITAR
      if (v.id) {
        // >>> AJUSTE AQUI conforme o nome real do seu método/endpoint
        // await this.services.updateExpense(v.id, payload);
        // ou:
        await (this.services as any).editExpense?.(v.id, payload) ??
          await (this.services as any).updateExpense?.(v.id, payload);

        // atualiza UI local (sem recarregar tudo)
        const idx = this.txsAll.findIndex((x) => x.id === v.id);
        if (idx >= 0) {
          const old = this.txsAll[idx];
          const updatedTx: Transaction = {
            id: v.id,
            desc,
            category,
            numeric: signed,
            value: this.formatarMoedaComSinal(signed),
          };

          const dateISO = old.dateISO ?? agora;
          const ui = this.toUiTx(updatedTx, dateISO);

          const copy = [...this.txsAll];
          copy[idx] = ui;
          this.txsAll = copy;
          this.aplicarFiltros();
        } else {
          // fallback: recarrega
          await this.carregarTodas();
        }

        this.salvando = false;
        return;
      }

      // ✅ CRIAR
      const res: any = await this.services.createExpense(payload);

      const id = String(
        res?.id ??
          res?._id ??
          res?.transactionId ??
          res?.data?.id ??
          res?.data?._id ??
          ""
      );

      const createdTx: Transaction = {
        id: id || undefined,
        desc,
        category,
        numeric: signed,
        value: this.formatarMoedaComSinal(signed),
      };

      const ui = this.toUiTx(createdTx, agora);
      this.txsAll = [ui, ...this.txsAll];
      this.aplicarFiltros();
    } catch (e) {
      console.error("Erro ao salvar transação (API)", e);
      // fallback seguro: recarrega lista
      await this.carregarTodas();
    } finally {
      this.salvando = false;
    }
  }

  async excluir(tx: UiTx): Promise<void> {
    if (!tx.id) {
      console.error("Sem id: não dá para excluir com segurança.");
      return;
    }

    const backupAll = [...this.txsAll];

    this.txsAll = this.txsAll.filter((x) => x.id !== tx.id);
    this.aplicarFiltros();

    try {
      await this.services.deleteExpense(tx.id);
    } catch (e) {
      console.error("Erro ao excluir (API)", e);
      this.txsAll = backupAll;
      this.aplicarFiltros();
    }
  }

  trackById(_: number, item: UiTx): string {
    return item.id ?? item.desc + item.value + (item.dateISO ?? "");
  }

  // =========================
  // MAPEAMENTO UI
  // =========================
  private mapToUiTx(lista: any[]): UiTx[] {
    const agora = new Date();
    const hojeKey = this.dateKey(agora);
    const ontem = new Date(agora);
    ontem.setDate(agora.getDate() - 1);
    const ontemKey = this.dateKey(ontem);

    const normalizadas = (lista as any[]).map((item) => {
      const valor: number = item.value ?? 0;
      const descricao: string = item.description ?? item.desc ?? "Transação";
      const id: string | undefined = item.id ?? item._id ?? item.transactionId;

      const iso = item.date ? String(item.date) : new Date().toISOString();
      const dt = new Date(iso);
      const key = this.dateKey(dt);

      const groupLabel =
        key === hojeKey ? "Hoje" : key === ontemKey ? "Ontem" : this.formatarDataCurta(dt);

      const category = (item.category ?? "").trim();

      return this.toUiTx(
        {
          id,
          desc: descricao,
          category,
          numeric: valor,
          value: this.formatarMoedaComSinal(valor),
        },
        iso
      );
    });

    normalizadas.sort((a, b) => new Date(b.dateISO ?? 0).getTime() - new Date(a.dateISO ?? 0).getTime());
    return normalizadas;
  }

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

  private formatarMoedaComSinal(valor: number): string {
    const arredondado = Math.round(valor);
    const sinal = arredondado < 0 ? "-" : "+";
    return sinal + "R$ " + new Intl.NumberFormat("pt-BR").format(Math.abs(arredondado));
  }

  private parseValorMoeda(v: string): number {
    if (!v) return 0;
    let s = v.replace(/R\$|\s/g, "");
    s = s.replace(/\./g, "");
    s = s.replace(/,/g, ".");
    s = s.replace(/[+-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
}
