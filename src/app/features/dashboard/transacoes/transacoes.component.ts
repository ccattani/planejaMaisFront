import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TransactionService } from '../../../core/service/transaction.service';
import { ServicesService } from '../../../core/service/services.service';
import { Transaction } from '../../../shared/models/interfaces/transaction';

@Component({
  selector: 'app-transacoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transacoes.component.html',
  styleUrls: ['./transacoes.component.scss']
})
export class TransacoesComponent implements OnInit, OnDestroy, OnChanges {
  @Input() transactions: Transaction[] = [];
  @Output() remove = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() add = new EventEmitter<Transaction>();

  mostrarNovaTransacao = false;
  novaTransacaoDescricao = '';
  novaTransacaoCategoria = '';
  novaTransacaoValor = '';
  novaTransacaoTipo: 'entrada' | 'saida' = 'saida';
  private sub?: Subscription;
  editarIndice: number | null = null;

  constructor(private servicoTransacao: TransactionService, private services: ServicesService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.sub = this.servicoTransacao.open$().subscribe((payload) => {
      this.mostrarNovaTransacao = true;
      if (payload && typeof payload !== 'undefined') {
        this.editarIndice = payload.index ?? null;
        this.novaTransacaoDescricao = payload.desc || '';
        this.novaTransacaoCategoria = payload.category ?? '';
        const valor = payload.value ? String(Math.abs(Math.round(this.converterStringParaNumero(payload.value))) ) : '';
        this.novaTransacaoValor = valor;
        // determina se é entrada (positivo) ou saída (negativo)
        this.novaTransacaoTipo = this.converterStringParaNumero(payload.value ?? '') < 0 ? 'saida' : 'entrada';
      } else {
        this.editarIndice = null;
        this.novaTransacaoDescricao = '';
        this.novaTransacaoCategoria = '';
        this.novaTransacaoValor = '';
        this.novaTransacaoTipo = 'saida';
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['transactions']) {
      console.log('TransacoesComponent: transactions Input mudou ->', changes['transactions'].currentValue);
      // Forçar detecção caso o pai substitua a lista
      this.cdr.detectChanges();
    }
  }

  private converterStringParaNumero(v: string): number {
    if (!v) return 0;
    let stringLimpa = v.replace(/R\$|\s/g, '');
    stringLimpa = stringLimpa.replace(/\./g, '');
    stringLimpa = stringLimpa.replace(/,/g, '.');
    const numero = parseFloat(stringLimpa);
    return isNaN(numero) ? 0 : numero;
  }

  private formatarValorComoMoeda(n: number): string {
    const rounded = Math.round(n);
    const sign = n < 0 ? '-' : '+';
    return sign + 'R$ ' + new Intl.NumberFormat('pt-BR').format(Math.abs(rounded));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  remover(i: number) { this.remove.emit(i); }
  editar(i: number) { this.edit.emit(i); }

  fecharNovaTransacao() {
    this.mostrarNovaTransacao = false;
    this.novaTransacaoDescricao = '';
    this.novaTransacaoCategoria = '';
    this.novaTransacaoValor = '';
    this.novaTransacaoTipo = 'saida';
    this.editarIndice = null;
  }

  async adicionarTransacao() {
    const descricao = this.novaTransacaoDescricao.trim() || 'Transação';
    const valorNumerico = this.converterStringParaNumero(this.novaTransacaoValor);
    if (valorNumerico <= 0) return this.fecharNovaTransacao();

    const signedValue = this.novaTransacaoTipo === 'saida' ? -valorNumerico : valorNumerico;
    const valorFormatado = this.formatarValorComoMoeda(signedValue);

    const agora = new Date().toISOString();
    const category = this.novaTransacaoCategoria.trim() || descricao;

    const payload = {
      description: descricao,
      value: signedValue,
      category: category,
      date: agora,
      updatedAt: agora,
    };

    try {
      console.log('Criando transação:', payload);
      await this.services.createExpense(payload);
      console.log('Transação criada com sucesso (API)');
    } catch (err) {
      console.error('Erro ao criar lançamento (API):', err);
    }

    const evento: Transaction = { desc: descricao, value: valorFormatado, numeric: signedValue, index: this.editarIndice ?? undefined };
    console.log('Emitindo evento adicionaTransacao ->', evento);
    this.add.emit(evento);

    try {
      if (evento.index === undefined || evento.index === null) {
        this.transactions = [{ desc: evento.desc, value: evento.value }, ...this.transactions];
      } else {
        const updated = [...this.transactions];
        updated[evento.index] = { desc: evento.desc, value: evento.value };
        this.transactions = updated;
      }
      this.cdr.detectChanges();
    } catch (e) {
      console.warn('Falha na atualização otimista local:', e);
    }

    this.fecharNovaTransacao();
  }
}
