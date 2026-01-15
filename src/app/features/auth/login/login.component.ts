import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../../core/service/services.service';
import { LoginPayload } from '../../../shared/models/interfaces/login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {

  form: LoginPayload = {
    user: '',
    passwordHash: '',
    remember: false,
  };

  loading = false;
  error = '';

  constructor(
    private service: ServicesService,
    private router: Router
  ) {}

  async submit() {
    if (this.loading) return;

    this.loading = true;
    this.error = '';

    try {
      let token = await this.service.login(this.form);
      token = this.normalizeToken(token);

      const storage = this.form.remember ? localStorage : sessionStorage;
      storage.setItem('token', token);

      this.router.navigate(['/home']);
    } catch (err: any) {
      const backendMsg = err?.error;

      if (backendMsg === 'Conta não verificada') {
        try {
          await this.service.sendAuthEmail(this.form.user);
          this.error =
            'Sua conta ainda não foi ativada. Enviamos um e-mail para você confirmar.';
        } catch {
          this.error = 'Falha ao enviar o e-mail de ativação.';
        }
        return;
      }

      this.error = 'Usuário ou senha inválidos';
    } finally {
      this.loading = false;
    }
  }

  private normalizeToken(raw: any): string {
    if (!raw) return '';

    if (typeof raw === 'string') {
      return raw.replace(/"/g, '').trim();
    }

    if (typeof raw === 'object' && typeof raw.token === 'string') {
      return raw.token.replace(/"/g, '').trim();
    }

    return String(raw).replace(/"/g, '').trim();
  }
}
