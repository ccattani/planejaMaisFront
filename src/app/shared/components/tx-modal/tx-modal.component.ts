import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type TxType = 'entrada' | 'saida';

export type TxModalValue = {
  id?: string;
  desc: string;
  category: string;
  value: string;  // string pra aceitar "230,50"
  type: TxType;
};

@Component({
  selector: 'app-tx-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tx-modal.component.html',
  styleUrls: ['./tx-modal.component.scss'],
})
export class TxModalComponent {
  @Output() saved = new EventEmitter<TxModalValue>();
  @Output() closed = new EventEmitter<void>();

  isOpen = false;
  saving = false;

  // modo edição é derivado do id
  form: TxModalValue = this.blank();

  open(initial?: Partial<TxModalValue>) {
    this.saving = false;
    this.isOpen = true;
    this.form = { ...this.blank(), ...initial };
  }

  close() {
    if (this.saving) return;
    this.isOpen = false;
    this.form = this.blank();
    this.closed.emit();
  }

  get isEditMode(): boolean {
    return !!this.form.id;
  }

  // Validações mínimas
  get isInvalidDesc(): boolean {
    return !this.form.desc || this.form.desc.trim().length < 2;
  }

  get isInvalidValue(): boolean {
    const n = this.parseMoney(this.form.value);
    return !Number.isFinite(n) || n <= 0;
  }

  submit() {
    if (this.isInvalidDesc || this.isInvalidValue) return;

    // normaliza (trim)
    const payload: TxModalValue = {
      ...this.form,
      desc: this.form.desc.trim(),
      category: (this.form.category ?? '').trim(),
      value: (this.form.value ?? '').trim(),
    };

    this.saved.emit(payload);
    // fecha depois de emitir
    this.close();
  }

  // Helpers
  private blank(): TxModalValue {
    return {
      id: undefined,
      desc: '',
      category: '',
      value: '',
      type: 'saida',
    };
  }

  private parseMoney(v: string): number {
    const raw = (v ?? '').trim();
    if (!raw) return NaN;

    // remove separador de milhar e troca vírgula por ponto
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  }
}
