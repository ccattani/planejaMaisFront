import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TransactionService } from '../../../core/service/transaction.service';
import { ServicesService } from '../../../core/service/services.service';
import { Transaction } from '../../../shared/models/interfaces/transaction';
import { Router } from '@angular/router';

@Component({
  selector: 'app-transacoes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule],
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

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  pageSize = 10;
  pageIndex = 0;
  pagedTransactions: Transaction[] = [];

  private updatePagedTransactions() {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedTransactions = this.transactions.slice(start, end);
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedTransactions();
    this.cdr.detectChanges();
  }

  constructor(private servicoTransacao: TransactionService, private services: ServicesService, private cdr: ChangeDetectorRef, private router: Router) {}

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

    // Se acessado diretamente pela rota de Transações, carrega todas as transações do backend
    if (this.router && this.router.url && this.router.url.includes('/transactions')) {
      this.loadAllTransactions();
    }

    // Inicializa paginação com os dados atualmente presentes
    this.updatePagedTransactions();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['transactions']) {
      console.log('TransacoesComponent: transactions Input mudou ->', changes['transactions'].currentValue);
      // Forçar detecção caso o pai substitua a lista
      this.cdr.detectChanges();
      this.updatePagedTransactions();
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

  // Carrega todas as transações do backend e mapeia para o formato esperado pelo componente
  private async loadAllTransactions() {
    try {
      const res: any = await this.services.getAllTransactions();
      const arr = Array.isArray(res) ? res : (res?.data ?? []);
      const mapped = (arr as any[]).map((transaction) => {
        const valor = transaction.value ?? 0;
        const valorFormatado = this.formatarValorComoMoeda(valor);
        const descricao = transaction.description ?? (transaction.desc as string) ?? 'Transação';
        return { desc: descricao, value: valorFormatado, numeric: valor } as Transaction;
      });
      this.transactions = mapped;
      this.updatePagedTransactions();
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Erro ao buscar transações', err);
    }
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
      this.updatePagedTransactions();
      this.cdr.detectChanges();
    } catch (e) {
      console.warn('Falha na atualização otimista local:', e);
    }

    this.fecharNovaTransacao();
  }
}
