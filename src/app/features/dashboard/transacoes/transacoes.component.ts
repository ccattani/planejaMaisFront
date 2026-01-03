import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TransactionService } from '../../../core/service/transaction.service';

export interface Transaction {
  desc: string;
  value: string;
}

@Component({
  selector: 'app-transacoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transacoes.component.html',
  styleUrls: ['./transacoes.component.scss']
})
export class TransacoesComponent implements OnInit, OnDestroy {
  @Input() transactions: Transaction[] = [];
  @Output() remove = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() add = new EventEmitter<Transaction>();

  mostrarNovaTransacao = false;
  novaTransacaoDescricao = '';
  novaTransacaoValor = '';
  private sub?: Subscription;

  constructor(private servicoTransacao: TransactionService) {}

  ngOnInit(): void {
    this.sub = this.servicoTransacao.open$().subscribe(() => (this.mostrarNovaTransacao = true));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  remover(i: number) { this.remove.emit(i); }
  editar(i: number) { this.edit.emit(i); }

  fecharNovaTransacao() {
    this.mostrarNovaTransacao = false;
    this.novaTransacaoDescricao = '';
    this.novaTransacaoValor = '';
  }

  adicionarTransacao() {
    const transacao: Transaction = { desc: this.novaTransacaoDescricao, value: this.novaTransacaoValor };
    this.add.emit(transacao);
    this.fecharNovaTransacao();
  }
}
