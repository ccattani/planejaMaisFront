import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { ServicesService } from "../../../core/service/services.service";
import { CreateGoalPayload } from "../../../shared/models/interfaces/metas";
// se você tiver o tipo do payload de transação, importe. Se não, deixa any.
// import { TransactionPayload } from "../../../shared/models/interfaces/transaction";

type GoalForm = {
  title: string;
  tipo: "mensal" | "anual";
  month: number; // 1..12 (mensal) ou 0 (anual)
  year: number;
  goal: number | null;
};

type GoalItem = CreateGoalPayload;

const TITLES_KEY = "planeja_goal_titles_v1";
const GOAL_CATEGORY_PREFIX = "@goal:";

type GuardadoForm = {
  goalKey: string; // "YYYY-M"
  tipo: "guardar" | "tirar"; // guardar = sai do saldo / tirar = volta pro saldo
  valor: string; // texto "230,50"
  desc: string; // opcional
};

@Component({
  selector: "app-metas",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./metas.component.html",
  styleUrls: ["./metas.component.scss"],
})
export class MetasComponent implements OnInit {
  // =======================
  // LISTAGEM (BACKEND)
  // =======================
  goals: GoalItem[] = [];
  carregandoLista = false;
  erroLista = "";

  // =======================
  // TRANSACOES (BACKEND)
  // =======================
  carregandoTxs = false;
  erroTxs = "";
  private savedByKey: Record<string, number> = {};

  // =======================
  // FILTRO (UI) - "Ordenar" por tipo (na real é filtro)
  // =======================
  sortFilter: "todas" | "mensal" | "anual" = "todas";
  isSortMenuOpen = false;

  toggleSortMenu(): void {
    this.isSortMenuOpen = !this.isSortMenuOpen;
  }

  setSortFilter(v: "todas" | "mensal" | "anual"): void {
    this.sortFilter = v;
    this.isSortMenuOpen = false;
  }

  get goalsView(): GoalItem[] {
    const base = this.goals ?? [];

    if (this.sortFilter === "mensal") return base.filter((g) => g.month !== 0);
    if (this.sortFilter === "anual") return base.filter((g) => g.month === 0);

    return base;
  }

  // =======================
  // EDIT MODE
  // =======================
  isEditMode = false;
  editingId: string | null = null;

  // =======================
  // TÍTULOS (front-only)
  // =======================
  private goalTitles: Record<string, string> = this.loadTitles();

  // =======================
  // MODAL
  // =======================
  isCreateOpen = false;
  saving = false;
  touched = false;
  errorMsg = "";

  form: GoalForm = this.blankForm();

  // =======================
  // Lançar guardado
  // =======================
  guardado: GuardadoForm = {
    goalKey: "",
    tipo: "guardar",
    valor: "",
    desc: "",
  };

  salvandoGuardado = false;
  guardadoMsg = "";

  constructor(private service: ServicesService) {}

  async ngOnInit(): Promise<void> {
    await this.buscarMetas();
    await this.recalcularGuardadoPorMeta();
    this.setGuardadoDefault();
  }

  // -------------------- Helpers --------------------
  private goalKey(g: { year: number; month: number }): string {
    return `${g.year}-${g.month}`;
  }

  trackByGoalId = (_: number, g: GoalItem) => (g as any)?._id ?? this.goalKey(g);

  private normalize(s: string): string {
    return (s ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  private buildGoalCategory(goalKey: string): string {
    return `${GOAL_CATEGORY_PREFIX}${goalKey}`;
  }

  // -------------------- Títulos --------------------
  private loadTitles(): Record<string, string> {
    try {
      const raw = localStorage.getItem(TITLES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveTitles(): void {
    localStorage.setItem(TITLES_KEY, JSON.stringify(this.goalTitles));
  }

  getGoalTitle(g: GoalItem): string {
    const k = this.goalKey(g);
    return (
      this.goalTitles[k] ||
      (g.month === 0 ? `Meta anual ${g.year}` : `Meta ${g.year}-${g.month}`)
    );
  }

  getGoalKeyLabel(key: string): string {
    const found = this.goals.find((g) => this.goalKey(g) === key);
    if (!found) return key;
    return this.getGoalTitle(found);
  }

  private setGuardadoDefault(): void {
    if (!this.guardado.goalKey && this.goals.length) {
      this.guardado.goalKey = this.goalKey(this.goals[0]);
    }
  }

  // =======================
  // KPIs
  // =======================
  get totalMetas(): number {
    return this.goals.length;
  }

  get metasAnuais(): number {
    return this.goals.filter((g) => g.month === 0).length;
  }

  get metasMensais(): number {
    return this.goals.filter((g) => g.month !== 0).length;
  }

  // =======================
  // FORMATAÇÃO R$
  // =======================
  formatBRL(value: unknown): string {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  }

  private parseValorMoeda(v: string): number {
    if (!v) return NaN;
    let s = v.replace(/R\$|\s/g, "");
    s = s.replace(/\./g, "");
    s = s.replace(/,/g, ".");
    s = s.replace(/[+-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  // =======================
  // GUARDADO POR META (via transações)
  // =======================
  private matchTxToGoalKey(txCategory: string, goal: GoalItem): boolean {
    const cat = this.normalize(txCategory);
    if (!cat) return false;

    const key = this.goalKey(goal);
    const keyNorm = this.normalize(key);

    const title = this.normalize(this.getGoalTitle(goal));

    if (title && cat === title) return true;
    if (keyNorm && cat.includes(keyNorm)) return true;

    // match robusto: token @goal:YYYY-M
    const token = this.normalize(this.buildGoalCategory(key));
    if (token && cat === token) return true;

    return false;
  }

  async recalcularGuardadoPorMeta(): Promise<void> {
    this.erroTxs = "";
    this.carregandoTxs = true;

    try {
      const resposta: any = await this.service.getAllTransactions();
      const lista = Array.isArray(resposta) ? resposta : resposta?.data ?? [];

      const map: Record<string, number> = {};
      for (const g of this.goals) map[this.goalKey(g)] = 0;

      for (const item of lista as any[]) {
        const category = (item.category ?? "").toString();
        const valor = Number(item.value ?? 0); // signed
        if (!Number.isFinite(valor) || valor === 0) continue;

        for (const g of this.goals) {
          if (this.matchTxToGoalKey(category, g)) {
            const k = this.goalKey(g);
            map[k] = (map[k] ?? 0) + valor;
            break;
          }
        }
      }

      this.savedByKey = map;
    } catch (err: any) {
      this.savedByKey = {};
      this.erroTxs =
        err?.error?.message ||
        err?.message ||
        "Erro ao buscar transações para calcular guardado das metas.";
    } finally {
      this.carregandoTxs = false;
    }
  }

  getSaved(g: GoalItem): number {
    const k = this.goalKey(g);
    return Number(this.savedByKey[k] ?? 0);
  }

  getRemaining(g: GoalItem): number {
    const goalAbs = Math.abs(Number(g.goal ?? 0));
    const savedAbs = Math.abs(this.getSaved(g));
    return Math.max(goalAbs - savedAbs, 0);
  }

  getProgressPct(g: GoalItem): number {
    const goalAbs = Math.abs(Number(g.goal ?? 0));
    if (goalAbs <= 0) return 0;
    const savedAbs = Math.abs(this.getSaved(g));
    const pct = (savedAbs / goalAbs) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  // =======================
  // LISTAGEM
  // =======================
  async buscarMetas(): Promise<void> {
    this.erroLista = "";
    this.carregandoLista = true;

    try {
      const res: any = await this.service.getMyGoals();
      const list = Array.isArray(res) ? res : res?.data ?? res?.goals ?? [];

      this.goals = (Array.isArray(list) ? list : []).sort((a, b) => {
        const da = new Date((a as any).updatedAt ?? 0).getTime();
        const db = new Date((b as any).updatedAt ?? 0).getTime();
        return db - da;
      });

      this.setGuardadoDefault();
      this.isSortMenuOpen = false; // evita menu aberto após reload
    } catch (err: any) {
      this.goals = [];
      this.erroLista =
        err?.error?.message ||
        err?.message ||
        "Erro ao buscar metas. Verifique token e endpoint.";
    } finally {
      this.carregandoLista = false;
    }
  }

  // =======================
  // Lançar guardado como transação
  // =======================
  async lancarGuardado(): Promise<void> {
    if (this.salvandoGuardado) return;

    this.guardadoMsg = "";

    const key = (this.guardado.goalKey ?? "").trim();
    if (!key) {
      this.guardadoMsg = "Selecione uma meta.";
      return;
    }

    const valorNum = this.parseValorMoeda(this.guardado.valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      this.guardadoMsg = "Informe um valor válido (maior que 0).";
      return;
    }

    const signed =
      this.guardado.tipo === "guardar" ? -Math.abs(valorNum) : Math.abs(valorNum);

    const agora = new Date().toISOString();

    const descUser = (this.guardado.desc ?? "").trim();
    const desc =
      descUser ||
      (this.guardado.tipo === "guardar" ? "Guardar na meta" : "Tirar da meta");

    const payload: any = {
      description: desc,
      value: signed,
      category: this.buildGoalCategory(key),
      date: agora,
      updatedAt: agora,
    };

    this.salvandoGuardado = true;

    try {
      await this.service.createExpense(payload);

      this.guardado.valor = "";
      this.guardado.desc = "";

      await this.recalcularGuardadoPorMeta();
      this.guardadoMsg = `Lançado em ${this.getGoalKeyLabel(key)}: ${this.formatBRL(
        signed
      )}`;
    } catch (err: any) {
      this.guardadoMsg =
        err?.error?.message || err?.message || "Erro ao lançar transação da meta.";
    } finally {
      this.salvandoGuardado = false;
    }
  }

  // =======================
  // MODAL / FORM de metas
  // =======================
  blankForm(): GoalForm {
    const now = new Date();
    return {
      title: "",
      tipo: "mensal",
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      goal: null,
    };
  }

  abrirCriarMeta() {
    this.isSortMenuOpen = false;

    this.isEditMode = false;
    this.editingId = null;

    this.form = this.blankForm();
    this.touched = false;
    this.errorMsg = "";
    this.isCreateOpen = true;
  }

  fecharCriarMeta() {
    if (this.saving) return;

    this.isSortMenuOpen = false;

    this.isCreateOpen = false;

    this.isEditMode = false;
    this.editingId = null;
    this.touched = false;
    this.errorMsg = "";
  }

  onTipoChange(tipo: "mensal" | "anual") {
    this.form.tipo = tipo;
    this.form.month = tipo === "anual" ? 0 : 1;
  }

  isInvalidTitle(): boolean {
    if (!this.touched) return false;
    return !this.form.title || this.form.title.trim().length < 3;
  }

  isInvalidGoal(): boolean {
    if (!this.touched) return false;
    return !Number.isFinite(Number(this.form.goal));
  }

  private buildPayload(): CreateGoalPayload | string {
    if (!this.form.title || this.form.title.trim().length < 3) {
      return "Título obrigatório (mín. 3 caracteres).";
    }

    const year = Number(this.form.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return "Ano inválido.";

    const goal = Number(this.form.goal);
    if (!Number.isFinite(goal)) return "Informe um valor de meta válido.";

    const month = this.form.tipo === "anual" ? 0 : Number(this.form.month);

    if (this.form.tipo === "mensal") {
      if (!Number.isInteger(month) || month < 1 || month > 12)
        return "Mês inválido (1 a 12).";
    } else {
      if (month !== 0) return "Meta anual exige month = 0.";
    }

    return {
      title: this.form.title.trim(),
      month,
      year,
      goal,
      updatedAt: new Date().toISOString(),
    };
  }

  async submitMeta() {
    if (this.isEditMode) return this.submitEditarMeta();
    return this.submitCriarMeta();
  }

  async submitCriarMeta() {
    this.touched = true;
    this.errorMsg = "";

    const payloadOrError = this.buildPayload();
    if (typeof payloadOrError === "string") {
      this.errorMsg = payloadOrError;
      return;
    }

    this.saving = true;

    try {
      const payloadForApi: any = {
        title: payloadOrError.title,
        month: payloadOrError.month,
        year: payloadOrError.year,
        goal: payloadOrError.goal,
        updatedAt: payloadOrError.updatedAt,
      };

      const res: any = await this.service.createGoal(payloadForApi);
      const created = res?.data ?? res?.goal ?? res ?? payloadOrError;

      const newItem: GoalItem = {
        _id: created._id,
        month: created.month ?? payloadOrError.month,
        year: created.year ?? payloadOrError.year,
        goal: created.goal ?? payloadOrError.goal,
        updatedAt: created.updatedAt ?? payloadOrError.updatedAt,
        user: created.user,
        title: payloadOrError.title,
      };

      const key = this.goalKey(newItem);
      this.goalTitles[key] = payloadOrError.title;
      this.saveTitles();

      this.isCreateOpen = false;

      await this.buscarMetas();
      await this.recalcularGuardadoPorMeta();
    } catch (err: any) {
      if (err?.status === 409) {
        const periodo =
          payloadOrError.month === 0
            ? `ano ${payloadOrError.year} (anual)`
            : `mês ${payloadOrError.month}/${payloadOrError.year}`;

        this.errorMsg =
          `Já existe uma meta cadastrada para ${periodo}. ` +
          `A API bloqueia duplicidade (409). Para mudar o valor, use Editar.`;
      } else {
        this.errorMsg =
          err?.error?.message || err?.message || "Erro ao criar meta. Verifique token e payload.";
      }
    } finally {
      this.saving = false;
    }
  }

  async submitEditarMeta() {
    this.touched = true;
    this.errorMsg = "";

    if (!this.editingId) {
      this.errorMsg = "Não foi possível editar: ID da meta não encontrado.";
      return;
    }

    const payloadOrError = this.buildPayload();
    if (typeof payloadOrError === "string") {
      this.errorMsg = payloadOrError;
      return;
    }

    this.saving = true;

    try {
      const payloadForApi: any = {
        title: payloadOrError.title,
        month: payloadOrError.month,
        year: payloadOrError.year,
        goal: payloadOrError.goal,
        updatedAt: new Date().toISOString(),
      };

      await this.service.updateGoals(this.editingId, payloadForApi);

      const key = this.goalKey({ year: payloadOrError.year, month: payloadOrError.month });
      this.goalTitles[key] = payloadOrError.title;
      this.saveTitles();

      this.fecharCriarMeta();

      await this.buscarMetas();
      await this.recalcularGuardadoPorMeta();
    } catch (err: any) {
      if (err?.status === 409) {
        const periodo =
          payloadOrError.month === 0
            ? `ano ${payloadOrError.year} (anual)`
            : `mês ${payloadOrError.month}/${payloadOrError.year}`;

        this.errorMsg = `Já existe uma meta cadastrada para ${periodo}. A API bloqueia duplicidade (409).`;
      } else {
        this.errorMsg =
          err?.error?.message || err?.message || "Erro ao editar meta. Verifique token e endpoint.";
      }
    } finally {
      this.saving = false;
    }
  }

  editarMeta(g: GoalItem) {
    this.isSortMenuOpen = false;

    if (!(g as any)?._id) {
      this.errorMsg = "Não foi possível editar: meta sem _id.";
      return;
    }

    this.isEditMode = true;
    this.editingId = (g as any)._id;
    this.touched = false;
    this.errorMsg = "";

    this.form = {
      title: this.getGoalTitle(g),
      tipo: g.month === 0 ? "anual" : "mensal",
      month: g.month === 0 ? 0 : g.month,
      year: g.year,
      goal: Number(g.goal),
    };

    // quando editar, já deixa “lançar” apontando pra essa meta
    this.guardado.goalKey = this.goalKey(g);

    this.isCreateOpen = true;
  }

  async excluirMeta(g: GoalItem) {
    this.isSortMenuOpen = false;

    if (!(g as any)?._id) {
      this.erroLista = "Não foi possível excluir: meta sem _id.";
      return;
    }

    const periodo = g.month === 0 ? `Ano ${g.year} (anual)` : `${g.month}/${g.year}`;
    const ok = confirm(`Excluir a meta de ${periodo}? Essa ação não tem volta.`);
    if (!ok) return;

    try {
      await this.service.deleteGoals((g as any)._id);

      const key = this.goalKey(g);
      delete this.goalTitles[key];
      this.saveTitles();

      await this.buscarMetas();
      await this.recalcularGuardadoPorMeta();
    } catch (err: any) {
      this.erroLista = err?.error?.message || err?.message || "Erro ao excluir meta.";
    }
  }
}
