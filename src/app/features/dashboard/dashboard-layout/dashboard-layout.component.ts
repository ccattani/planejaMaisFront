import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../../core/service/transaction.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss'],
})
export class DashboardLayoutComponent {
  menu = [
    { label: 'Dashboard', path: '/home' },
    { label: 'Transações', path: '/transactions' },
    { label: 'Metas', path: '/goals' },
    { label: 'Relatórios', path: '/reports' },
    { label: 'Configurações', path: '/profile' },
  ];

  constructor(private txService: TransactionService) {}

  openNewTx() {
    this.txService.open();
  }

  mobileNavOpen = false;

  toggleMobileNav() {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav() {
    this.mobileNavOpen = false;
  }
}
