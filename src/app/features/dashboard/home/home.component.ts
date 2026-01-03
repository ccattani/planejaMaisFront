import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransacoesComponent } from '../transacoes/transacoes.component';
import { VisibilityService } from '../../../core/service/visibility.service';
import { ServicesService } from '../../../core/service/services.service';


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

  mostrarNovaTransacao = false;
  novaTransacaoDescricao = '';
  novaTransacaoValor = '';
  constructor(public visibility: VisibilityService, private services: ServicesService) {}
  abrirNovaTransacao() {
    this.novaTransacaoDescricao = '';
    this.novaTransacaoValor = '';
    this.mostrarNovaTransacao = true;
  }

  abrirNovaTransacaoParaIndice(i: number) {
    const transacao = this.transactions[i];
    this.editingIndex = i;
    this.novaTransacaoDescricao = transacao?.desc || '';
    const valorNumerico = this.converterStringParaNumero(transacao?.value || '0');
    this.novaTransacaoValor = String(Math.abs(Math.round(valorNumerico)));
    this.mostrarNovaTransacao = true;
  }

  fecharNovaTransacao() {
    this.mostrarNovaTransacao = false;
  }

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

  async adicionarTransacao() {
    const descricao = this.novaTransacaoDescricao.trim() || 'Transação';
    const valorNumerico = this.converterStringParaNumero(this.novaTransacaoValor);
    if (valorNumerico <= 0) return this.fecharNovaTransacao();
    const valorFormatado = '-R$ ' + new Intl.NumberFormat('pt-BR').format(Math.round(valorNumerico));

    const agora = new Date().toISOString();
    const payload = {
      description: descricao,
      value: -valorNumerico,
      category: descricao,
      date: agora,
      updatedAt: agora
    };

    try {
      await this.services.createExpense(payload);
    } catch (err) {
      console.error('Erro ao criar lançamento:', err);
      // mantendo atualização otimista na UI
    }

    const saldoAtual = this.converterStringParaNumero(this.saldoTotal);
    const efeitoAnterior = this.editingIndex === null ? 0 : this.converterStringParaNumero(this.transactions[this.editingIndex!].value);
    const efeitoNovo = -valorNumerico;

    const saldoAtualizado = saldoAtual + (efeitoNovo - efeitoAnterior);
    this.saldoTotal = this.formatarNumeroParaMoeda(saldoAtualizado);

    if (this.editingIndex === null) {
      this.transactions.unshift({ desc: descricao, value: valorFormatado });
    } else {
      this.transactions[this.editingIndex] = { desc: descricao, value: valorFormatado };
    }

    this.editingIndex = null;
    this.fecharNovaTransacao();
  }

  removerTransacao(i: number) {
    const efeitoAnterior = this.converterStringParaNumero(this.transactions[i].value);
    const saldoAtual = this.converterStringParaNumero(this.saldoTotal);
    const saldoAtualizado = saldoAtual - efeitoAnterior;
    this.saldoTotal = this.formatarNumeroParaMoeda(saldoAtualizado);
    this.transactions.splice(i, 1);
  }

  editarTransacao(i: number) {
    this.abrirNovaTransacaoParaIndice(i);
  }

  receberTransacaoFilha(transacao: { desc: string; value: string }) {
    this.novaTransacaoDescricao = transacao.desc || '';
    this.novaTransacaoValor = transacao.value || '';
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
