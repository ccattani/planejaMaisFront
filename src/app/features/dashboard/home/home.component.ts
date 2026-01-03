import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransacoesComponent } from '../transacoes/transacoes.component';
import { VisibilityService } from '../../../core/service/visibility.service';
import { ServicesService } from '../../../core/service/services.service';
import { TransactionService } from '../../../core/service/transaction.service';

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

  editingIndex: number | null = null;

  constructor(public visibility: VisibilityService, private services: ServicesService, private servicoTransacao: TransactionService) {}
  private converterStringParaNumero(v: string): number {
    if (!v) return 0;
    let stringLimpa = v.replace(/R\$|\s/g, '');
    stringLimpa = stringLimpa.replace(/\./g, '');
    stringLimpa = stringLimpa.replace(/,/g, '.');
    const numero = parseFloat(stringLimpa);
    return isNaN(numero) ? 0 : numero;
  }

  private formatarNumeroParaMoeda(n: number): string {
    const rounded = Math.round(n);
    return 'R$ ' + new Intl.NumberFormat('pt-BR').format(rounded);
  }

  receberTransacaoFilha(transacao: { desc: string; value: string; numeric?: number; index?: number }) {
    const descricao = transacao.desc || 'Transação';
    const valorFormatado = transacao.value || '';
    const efeitoNovo = transacao.numeric ?? -this.converterStringParaNumero(valorFormatado);

    const saldoAtual = this.converterStringParaNumero(this.saldoTotal);
    const indice = transacao.index ?? this.editingIndex;
    const efeitoAnterior = (indice === null || indice === undefined) ? 0 : this.converterStringParaNumero(this.transactions[indice].value);

    const saldoAtualizado = saldoAtual + (efeitoNovo - efeitoAnterior);
    this.saldoTotal = this.formatarNumeroParaMoeda(saldoAtualizado);

    if (indice === null || indice === undefined) {
      this.transactions = [{ desc: descricao, value: valorFormatado }, ...this.transactions];
    } else {
      const updated = [...this.transactions];
      updated[indice] = { desc: descricao, value: valorFormatado };
      this.transactions = updated;
    }

    this.editingIndex = null;
  }

  removerTransacao(i: number) {
    const efeitoAnterior = this.converterStringParaNumero(this.transactions[i].value);
    const saldoAtual = this.converterStringParaNumero(this.saldoTotal);
    const saldoAtualizado = saldoAtual - efeitoAnterior;
    this.saldoTotal = this.formatarNumeroParaMoeda(saldoAtualizado);
    this.transactions.splice(i, 1);
  }

  editarTransacao(i: number) {
    // Solicita ao componente Transacoes que abra o modal em modo edição com os dados da transação
    const t = this.transactions[i];
    this.servicoTransacao.open({ desc: t.desc, value: t.value, index: i });
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
