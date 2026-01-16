import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { ServicesService } from "../../../core/service/services.service";
import { CreateGoalPayload } from "../../../shared/models/interfaces/metas";

type GoalForm = {
  title: string;
  tipo: "mensal" | "anual";
  month: number; // 1..12 (mensal) ou 0 (anual)
  year: number;
  goal: number | null;
};

type GoalItem = CreateGoalPayload;

const TITLES_KEY = "planeja_goal_titles_v1";

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

  // filtros (se ainda não usa, ok manter)
  filtroYear = new Date().getFullYear();
  filtroTipo: "mensal" | "anual" = "mensal";
  filtroMonth = new Date().getMonth() + 1;

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

  constructor(private service: ServicesService) {}

  async ngOnInit(): Promise<void> {
    await this.buscarMetas();
  }

  // -------------------- Helpers --------------------
  private goalKey(g: { year: number; month: number }): string {
    return `${g.year}-${g.month}`;
  }

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
  // LISTAGEM
  // =======================
  async buscarMetas(): Promise<void> {
    this.erroLista = "";
    this.carregandoLista = true;

    try {
      const res: any = await this.service.getMyGoals();
      const list = Array.isArray(res) ? res : res?.data ?? res?.goals ?? [];

      this.goals = (Array.isArray(list) ? list : []).sort((a, b) => {
        const da = new Date(a.updatedAt ?? 0).getTime();
        const db = new Date(b.updatedAt ?? 0).getTime();
        return db - da;
      });
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

  onFiltroTipoChange(tipo: "mensal" | "anual") {
    this.filtroTipo = tipo;
    if (
      tipo === "mensal" &&
      (!this.filtroMonth || this.filtroMonth < 1 || this.filtroMonth > 12)
    ) {
      this.filtroMonth = new Date().getMonth() + 1;
    }
    this.buscarMetas();
  }

  onFiltroYearChange() {
    this.buscarMetas();
  }

  onFiltroMonthChange() {
    if (this.filtroTipo === "mensal") this.buscarMetas();
  }

  // =======================
  // MODAL / FORM
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
    this.isEditMode = false;
    this.editingId = null;

    this.form = this.blankForm();
    this.touched = false;
    this.errorMsg = "";
    this.isCreateOpen = true;
  }

  fecharCriarMeta() {
    if (this.saving) return;

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
      title: this.form.title.trim(), // front-only
      month,
      year,
      goal,
      updatedAt: new Date().toISOString(),
    };
  }

  // =======================
  // SUBMIT (DECIDE CREATE vs UPDATE)
  // =======================
  async submitMeta() {
    if (this.isEditMode) return this.submitEditarMeta();
    return this.submitCriarMeta();
  }

  // =======================
  // CREATE
  // =======================
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
          err?.error?.message ||
          err?.message ||
          "Erro ao criar meta. Verifique token e payload.";
      }
    } finally {
      this.saving = false;
    }
  }

  // =======================
  // EDITAR (UPDATE)
  // =======================
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

      // atualiza título local pelo NOVO período (se mudou mês/ano)
      const key = this.goalKey({ year: payloadOrError.year, month: payloadOrError.month });
      this.goalTitles[key] = payloadOrError.title;
      this.saveTitles();

      this.fecharCriarMeta();
      await this.buscarMetas();
    } catch (err: any) {
      if (err?.status === 409) {
        const periodo =
          payloadOrError.month === 0
            ? `ano ${payloadOrError.year} (anual)`
            : `mês ${payloadOrError.month}/${payloadOrError.year}`;

        this.errorMsg =
          `Já existe uma meta cadastrada para ${periodo}. ` +
          `A API bloqueia duplicidade (409).`;
      } else {
        this.errorMsg =
          err?.error?.message ||
          err?.message ||
          "Erro ao editar meta. Verifique token e endpoint.";
      }
    } finally {
      this.saving = false;
    }
  }

  // =======================
  // ACTIONS
  // =======================
  editarMeta(g: GoalItem) {
    if (!g?._id) {
      this.errorMsg = "Não foi possível editar: meta sem _id.";
      return;
    }

    this.isEditMode = true;
    this.editingId = g._id;
    this.touched = false;
    this.errorMsg = "";

    this.form = {
      title: this.getGoalTitle(g),
      tipo: g.month === 0 ? "anual" : "mensal",
      month: g.month === 0 ? 0 : g.month,
      year: g.year,
      goal: Number(g.goal),
    };

    this.isCreateOpen = true;
  }

  async excluirMeta(g: GoalItem) {
    if (!g?._id) {
      this.erroLista = "Não foi possível excluir: meta sem _id.";
      return;
    }

    const periodo = g.month === 0 ? `Ano ${g.year} (anual)` : `${g.month}/${g.year}`;
    const ok = confirm(`Excluir a meta de ${periodo}? Essa ação não tem volta.`);
    if (!ok) return;

    try {
      await this.service.deleteGoals(g._id);

      const key = this.goalKey(g);
      delete this.goalTitles[key];
      this.saveTitles();

      await this.buscarMetas();
    } catch (err: any) {
      this.erroLista =
        err?.error?.message ||
        err?.message ||
        "Erro ao excluir meta.";
    }
  }
}
