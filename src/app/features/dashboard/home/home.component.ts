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
import { VisibilityService } from '../../../core/service/visibility.service';


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
    { desc: 'Salário', value: '+R$ 4.000' },
    { desc: 'Restaurante', value: '-R$ 120' },
  ];

  // Home no longer opens the shared modal directly; TransacoesComponent handles it.

  editingIndex: number | null = null;

  showNewTx = false;
  newTxDesc = '';
  newTxValue = '';
  constructor(public visibility: VisibilityService) {}
  abrirNovaTransacao() {
    this.newTxDesc = '';
    this.newTxValue = '';
    this.showNewTx = true;
  }

  abrirNovaTransacaoParaIndice(i: number) {
    const t = this.transactions[i];
    this.editingIndex = i;
    this.newTxDesc = t?.desc || '';
    const v = this.converterStringParaNumero(t?.value || '0');
    this.newTxValue = String(Math.abs(Math.round(v)));
    this.showNewTx = true;
  }

  fecharNovaTransacao() {
    this.showNewTx = false;
  }

  private converterStringParaNumero(v: string): number {
    if (!v) return 0;
    let s = v.replace(/R\$|\s/g, '');
    s = s.replace(/\./g, '');
    s = s.replace(/,/g, '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  private formatarNumeroParaMoeda(n: number): string {
    const rounded = Math.round(n);
    return 'R$ ' + new Intl.NumberFormat('pt-BR').format(rounded);
  }

  adicionarTransacao() {
    const desc = this.newTxDesc.trim() || 'Transação';
    const valueNum = this.converterStringParaNumero(this.newTxValue);
    if (valueNum <= 0) return this.fecharNovaTransacao();
    const formatted = '-R$ ' + new Intl.NumberFormat('pt-BR').format(Math.round(valueNum));

    const current = this.converterStringParaNumero(this.saldoTotal);
    const prevEffect = this.editingIndex === null ? 0 : this.converterStringParaNumero(this.transactions[this.editingIndex!].value);
    const newEffect = -valueNum;

    const updated = current + (newEffect - prevEffect);
    this.saldoTotal = this.formatarNumeroParaMoeda(updated);

    if (this.editingIndex === null) {
      this.transactions.unshift({ desc, value: formatted });
    } else {
      this.transactions[this.editingIndex] = { desc, value: formatted };
    }

    this.editingIndex = null;
    this.fecharNovaTransacao();
  }

  removerTransacao(i: number) {
    const prevEffect = this.converterStringParaNumero(this.transactions[i].value);
    const current = this.converterStringParaNumero(this.saldoTotal);
    const updated = current - prevEffect;
    this.saldoTotal = this.formatarNumeroParaMoeda(updated);
    this.transactions.splice(i, 1);
  }

  editarTransacao(i: number) {
    this.abrirNovaTransacaoParaIndice(i);
  }

  receberTransacaoFilha(tx: { desc: string; value: string }) {
    this.newTxDesc = tx.desc || '';
    this.newTxValue = tx.value || '';
    this.editingIndex = null;
    this.adicionarTransacao();
  }

  iniciarEdicao(key: 'saldoTotal' | 'metaMensal' | 'guardadoNoMes') {
    if (key === 'saldoTotal') this.editValues.saldoTotal = this.saldoTotal;
    else if (key === 'metaMensal') this.editValues.metaMensal = this.metaMensal;
    else if (key === 'guardadoNoMes') this.editValues.guardadoNoMes = this.guardadoNoMes;
    this.editing[key] = true;
  }

  salvarEdicao(key: 'saldoTotal' | 'metaMensal' | 'guardadoNoMes') {
    if (key === 'saldoTotal') this.saldoTotal = this.editValues.saldoTotal;
    else if (key === 'metaMensal') this.metaMensal = this.editValues.metaMensal;
    else if (key === 'guardadoNoMes') this.guardadoNoMes = this.editValues.guardadoNoMes;
    this.editing[key] = false;
  }

  cancelarEdicao(key: 'saldoTotal' | 'metaMensal' | 'guardadoNoMes') {
    if (key === 'saldoTotal') this.editValues.saldoTotal = this.saldoTotal;
    else if (key === 'metaMensal') this.editValues.metaMensal = this.metaMensal;
    else if (key === 'guardadoNoMes') this.editValues.guardadoNoMes = this.guardadoNoMes;
    this.editing[key] = false;
  }

}
