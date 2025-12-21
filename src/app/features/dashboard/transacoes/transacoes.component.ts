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

  showNewTx = false;
  newTxDesc = '';
  newTxValue = '';
  private sub?: Subscription;

  constructor(private txService: TransactionService) {}

  ngOnInit(): void {
    this.sub = this.txService.open$().subscribe(() => (this.showNewTx = true));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onRemove(i: number) { this.remove.emit(i); }
  onEdit(i: number) { this.edit.emit(i); }

  closeNewTx() {
    this.showNewTx = false;
    this.newTxDesc = '';
    this.newTxValue = '';
  }

  addTransaction() {
    const tx: Transaction = { desc: this.newTxDesc, value: this.newTxValue };
    this.add.emit(tx);
    this.closeNewTx();
  }
}
