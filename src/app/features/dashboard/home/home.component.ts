// import { Component } from "@angular/core";
// import { ServicesService } from "../../../core/service/services.service";
// import { Router } from "@angular/router";

// @Component({
//   selector: "app-home",
//   standalone: true,
//   imports: [],
//   templateUrl: "./home.component.html",
//   styleUrl: "./home.component.scss",
// })
// export class HomeComponent {
//   saldoTotal = "R$ 3.250";
//   metaMensal = "R$ 4.000";
//   guardadoNoMes = "R$ 1.200";

//   constructor(private service: ServicesService, private router: Router) {}

//   ngOnInit() {
//     this.loadUser();
//   }

//   async loadUser() {
//     try {
//       const data = await this.service.getMyAccount();
//       console.log("Minha conta:", data);
//     } catch (err) {
//       console.error("Erro ao carregar conta:", err);
//     }
//   }
// }

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransacoesComponent } from '../transacoes/transacoes.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, TransacoesComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  saldoTotal = 'R$ 3.250';
  metaMensal = 'R$ 4.000';
  guardadoNoMes = 'R$ 1.200';

  editing: { saldoTotal: boolean; metaMensal: boolean; guardadoNoMes: boolean } = {
    saldoTotal: false,
    metaMensal: false,
    guardadoNoMes: false,
  };

  editValues: { saldoTotal: string; metaMensal: string; guardadoNoMes: string } = {
    saldoTotal: this.saldoTotal,
    metaMensal: this.metaMensal,
    guardadoNoMes: this.guardadoNoMes,
  };

  transactions = [
    { desc: 'Supermercado', value: '-R$ 230' },
    { desc: 'Uber', value: '-R$ 32' },
    { desc: 'Salário Itaú', value: '+R$ 4.000' },
    { desc: 'Restaurante', value: '-R$ 120' },
  ];

  // Home no longer opens the shared modal directly; TransacoesComponent handles it.

  editingIndex: number | null = null;

  showNewTx = false;
  newTxDesc = '';
  newTxValue = '';

  openNewTx() {
    this.newTxDesc = '';
    this.newTxValue = '';
    this.showNewTx = true;
  }

  openNewTxForIndex(i: number) {
    const t = this.transactions[i];
    this.editingIndex = i;
    this.newTxDesc = t?.desc || '';
    // store numeric value without sign
    const v = this.parseCurrencyString(t?.value || '0');
    this.newTxValue = String(Math.abs(Math.round(v)));
    this.showNewTx = true;
  }

  closeNewTx() {
    this.showNewTx = false;
  }

  private parseCurrencyString(v: string): number {
    if (!v) return 0;
    // remove currency symbol and spaces
    let s = v.replace(/R\$|\s/g, '');
    // if contains dot as thousand separator and comma as decimal, normalize
    s = s.replace(/\./g, '');
    s = s.replace(/,/g, '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  private formatCurrencyNumber(n: number): string {
    const rounded = Math.round(n);
    return 'R$ ' + new Intl.NumberFormat('pt-BR').format(rounded);
  }

  addTransaction() {
    const desc = this.newTxDesc.trim() || 'Transação';
    const valueNum = this.parseCurrencyString(this.newTxValue);
    if (valueNum <= 0) return this.closeNewTx();
    const formatted = '-R$ ' + new Intl.NumberFormat('pt-BR').format(Math.round(valueNum));

    const current = this.parseCurrencyString(this.saldoTotal);
    const prevEffect = (this.editingIndex === null) ? 0 : this.parseCurrencyString(this.transactions[this.editingIndex!].value);
    const newEffect = -valueNum;

    const updated = current + (newEffect - prevEffect);
    this.saldoTotal = this.formatCurrencyNumber(updated);

    if (this.editingIndex === null) {
      this.transactions.unshift({ desc, value: formatted });
    } else {
      this.transactions[this.editingIndex] = { desc, value: formatted };
    }

    this.editingIndex = null;
    this.closeNewTx();
  }

  onRemove(i: number) {
    const prevEffect = this.parseCurrencyString(this.transactions[i].value);
    const current = this.parseCurrencyString(this.saldoTotal);
    const updated = current - prevEffect;
    this.saldoTotal = this.formatCurrencyNumber(updated);
    this.transactions.splice(i, 1);
  }

  onEdit(i: number) {
    this.openNewTxForIndex(i);
  }

  handleChildAdd(tx: { desc: string; value: string }) {
    this.newTxDesc = tx.desc || '';
    this.newTxValue = tx.value || '';
    this.editingIndex = null;
    this.addTransaction();
  }

  startEdit(key: 'saldoTotal' | 'metaMensal' | 'guardadoNoMes') {
    if (key === 'saldoTotal') this.editValues.saldoTotal = this.saldoTotal;
    else if (key === 'metaMensal') this.editValues.metaMensal = this.metaMensal;
    else if (key === 'guardadoNoMes') this.editValues.guardadoNoMes = this.guardadoNoMes;
    this.editing[key] = true;
  }

  saveEdit(key: 'saldoTotal' | 'metaMensal' | 'guardadoNoMes') {
    if (key === 'saldoTotal') this.saldoTotal = this.editValues.saldoTotal;
    else if (key === 'metaMensal') this.metaMensal = this.editValues.metaMensal;
    else if (key === 'guardadoNoMes') this.guardadoNoMes = this.editValues.guardadoNoMes;
    this.editing[key] = false;
  }

  cancelEdit(key: 'saldoTotal' | 'metaMensal' | 'guardadoNoMes') {
    if (key === 'saldoTotal') this.editValues.saldoTotal = this.saldoTotal;
    else if (key === 'metaMensal') this.editValues.metaMensal = this.metaMensal;
    else if (key === 'guardadoNoMes') this.editValues.guardadoNoMes = this.guardadoNoMes;
    this.editing[key] = false;
  }

}
