import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../../core/service/services.service';
import { RegisterPayload } from '../../../shared/models/interfaces/register';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  form = {
    name: '',
    user: '',
    email: '',
    birthday: '', // YYYY-MM-DD (vem do input date)
    password: '',
  };

  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(
    private service: ServicesService,
    private router: Router
  ) {}

  async submit() {
    if (this.loading) return;

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    try {
      const now = new Date().toISOString();

      const payload: RegisterPayload = {
        name: this.form.name.trim(),
        user: this.form.user.trim(),
        email: this.form.email.trim(),
        lastEmail: this.form.email.trim(),

        // Evita bug de timezone: mantém a data "pura" em UTC (00:00Z)
        birthday: this.dateToUtcIso(this.form.birthday),

        // Sim, ainda é "passwordHash" no contrato, mas aqui é senha em texto.
        // Ideal é corrigir backend depois.
        passwordHash: this.form.password,

        createdAt: now,
        updatedAt: now,
        isActive: false,
      };

      await this.service.createAccount(payload);

      // mensagem correta pro fluxo com ativação
      this.successMsg = 'Conta criada! Verifique seu e-mail para ativar.';

      // opcional: redireciona após 1.2s (se quiser imediato, troca por navigate já)
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 1200);
    } catch (err: any) {
      // tenta extrair mensagem com segurança
      this.errorMsg =
        err?.error?.message ||
        err?.error ||
        'Erro ao criar conta';
    } finally {
      this.loading = false;
    }
  }

  private dateToUtcIso(yyyyMmDd: string): string {
    // input date => "YYYY-MM-DD"
    // transforma em ISO fixo UTC 00:00:00Z sem shift de timezone
    if (!yyyyMmDd) return new Date().toISOString();

    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    if (!y || !m || !d) return new Date().toISOString();

    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();
  }
}
