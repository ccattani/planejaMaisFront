import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ServicesService } from '../../../core/service/services.service';
import { CreateGoalPayload } from '../../../shared/models/interfaces/metas';

type GoalForm = {
  title: string;
  tipo: 'mensal' | 'anual';
  month: number; // 1..12 (mensal) ou 0 (anual)
  year: number;
  goal: number | null;
};

type GoalItem = CreateGoalPayload;

const TITLES_KEY = 'planeja_goal_titles_v1';

@Component({
  selector: 'app-metas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './metas.component.html',
  styleUrls: ['./metas.component.scss'],
})
export class MetasComponent {
  // filtros (placeholders)
  mesLabel = 'Janeiro';
  filtroCategoriaLabel = 'Todas';
  filtroStatusLabel = 'Todos';
  filtroPrazoLabel = '--';

  // lista goals (frontend, atualiza quando cria)
  goals: GoalItem[] = [];

  // títulos (front-only)
  private goalTitles: Record<string, string> = this.loadTitles();

  // modal
  isCreateOpen = false;
  saving = false;
  touched = false;
  errorMsg = '';

  form: GoalForm = this.blankForm();

  constructor(private service: ServicesService) {}

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

  private saveTitles() {
    localStorage.setItem(TITLES_KEY, JSON.stringify(this.goalTitles));
  }

  getGoalTitle(g: GoalItem): string {
    const k = this.goalKey(g);
    return this.goalTitles[k] || (g.month === 0 ? `Meta anual ${g.year}` : `Meta ${g.year}-${g.month}`);
  }

  private existsGoal(month: number, year: number): boolean {
    return this.goals.some(g => g.month === month && g.year === year);
  }

  // -------------------- KPIs --------------------
  get totalMetas(): number {
    return this.goals.length;
  }

  get metasAnuais(): number {
    return this.goals.filter(g => g.month === 0).length;
  }

  get metasMensais(): number {
    return this.goals.filter(g => g.month !== 0).length;
  }

  // -------------------- Modal/Form --------------------
  blankForm(): GoalForm {
    const now = new Date();
    return {
      title: '',
      tipo: 'mensal',
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      goal: null,
    };
  }

  abrirCriarMeta() {
    this.form = this.blankForm();
    this.touched = false;
    this.errorMsg = '';
    this.isCreateOpen = true;
  }

  fecharCriarMeta() {
    if (this.saving) return;
    this.isCreateOpen = false;
  }

  onTipoChange(tipo: 'mensal' | 'anual') {
    this.form.tipo = tipo;
    this.form.month = tipo === 'anual' ? 0 : 1;
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
    // título é front-only (backend não aceita)
    if (!this.form.title || this.form.title.trim().length < 3) {
      return 'Título obrigatório (mín. 3 caracteres).';
    }

    const year = Number(this.form.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return 'Ano inválido.';

    const goal = Number(this.form.goal);
    if (!Number.isFinite(goal)) return 'Informe um valor de meta válido.';

    const month = this.form.tipo === 'anual' ? 0 : Number(this.form.month);
    if (this.form.tipo === 'mensal') {
      if (!Number.isInteger(month) || month < 1 || month > 12) return 'Mês inválido (1 a 12).';
    } else {
      if (month !== 0) return 'Meta anual exige month = 0.';
    }

    return {
      month,
      year,
      goal,
      updatedAt: new Date().toISOString(),
    };
  }

  // -------------------- Create --------------------
  async submitCriarMeta() {
    this.touched = true;
    this.errorMsg = '';

    const payloadOrError = this.buildPayload();
    if (typeof payloadOrError === 'string') {
      this.errorMsg = payloadOrError;
      return;
    }

    // bloqueia duplicidade só com o que você tem carregado na sessão
    if (this.existsGoal(payloadOrError.month, payloadOrError.year)) {
      this.errorMsg = 'Já existe uma meta para esse mês/ano nesta sessão. A API não aceita duplicidade.';
      return;
    }

    this.saving = true;

    try {
      const res: any = await this.service.createGoal(payloadOrError);

      // Tenta extrair; se não vier nada, usa payload
      const created = res?.data ?? res?.goal ?? res ?? payloadOrError;

      const newItem: GoalItem = {
        month: created.month ?? payloadOrError.month,
        year: created.year ?? payloadOrError.year,
        goal: created.goal ?? payloadOrError.goal,
        updatedAt: created.updatedAt ?? payloadOrError.updatedAt,
      };

      // salva título local associado ao período
      const key = this.goalKey(newItem);
      this.goalTitles[key] = this.form.title.trim();
      this.saveTitles();

      // atualiza lista
      this.goals = [newItem, ...this.goals];

      this.isCreateOpen = false;
    } catch (err: any) {
      // Aqui resolve "não aparecer 409" como erro genérico:
      // vira mensagem clara de duplicidade.
      if (err?.status === 409) {
        const periodo = payloadOrError.month === 0
          ? `ano ${payloadOrError.year} (anual)`
          : `mês ${payloadOrError.month}/${payloadOrError.year}`;
        this.errorMsg =
          `Já existe uma meta cadastrada para ${periodo}. ` +
          `A API bloqueia duplicidade (409). Se quiser mudar o valor, precisa de endpoint de UPDATE.`;
      } else {
        this.errorMsg =
          err?.error?.message ||
          err?.message ||
          'Erro ao criar meta. Verifique token e payload.';
      }
    } finally {
      this.saving = false;
    }
  }

  // -------------------- filtros placeholders --------------------
  limparTodosFiltros() {
    this.filtroCategoriaLabel = 'Todas';
    this.filtroStatusLabel = 'Todos';
    this.filtroPrazoLabel = '--';
  }

  toggleCategoria() {
    this.filtroCategoriaLabel = this.filtroCategoriaLabel === 'Todas' ? 'Custom' : 'Todas';
  }

  toggleStatus() {
    this.filtroStatusLabel = this.filtroStatusLabel === 'Todos' ? 'Ativas' : 'Todos';
  }

  togglePrazo() {
    this.filtroPrazoLabel = this.filtroPrazoLabel === '--' ? 'Ano' : '--';
  }
}
