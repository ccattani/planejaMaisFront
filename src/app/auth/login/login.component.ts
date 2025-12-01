import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthCardComponent } from '../components/auth-card/auth-card.component';
import { ServicesService } from '../../service/services.service';
import { LoginPayload } from '../../interfaces/login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [AuthCardComponent, RouterModule, CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  form: LoginPayload = {
    user: '',
    passwordHash: '',
    remember: false
  };

  loading = false;
  error = '';

  constructor(
    private service: ServicesService,
    private router: Router
  ) {}

  private isAccountInactive(error: string): boolean {
    return [
      'active',
      'ativ',
      'verific',
      'not active',
      'ACCOUNT_NOT_ACTIVE'
    ].some(flag => error.toLowerCase().includes(flag));
  }

  async submit() {
    this.loading = true;
    this.error = '';

    try {
      // --- LOGIN ---
      let token = await this.service.login(this.form);
      token = token.replace(/"/g, '');

      // --- ARMAZENAMENTO ---
      const storage = this.form.remember ? localStorage : sessionStorage;
      storage.setItem('token', token);

      // --- REDIRECT ---
      this.router.navigate(['/profile']);

    } catch (err: any) {

      const backendError =
        err?.error?.error ||
        err?.error ||
        err?.message ||
        '';

      console.log('ERRO BACKEND:', backendError);

      // --- CONTA NÃO ATIVA ---
      if (this.isAccountInactive(backendError)) {
        try {
          await this.service.sendAuthEmail();
          this.error = 'Sua conta ainda não está ativa. Reenviamos o e-mail de confirmação.';
        } catch {
          this.error = 'Falha ao enviar o e-mail de ativação.';
        }
        return;
      }

      // --- LOGIN INVÁLIDO ---
      this.error = 'Usuário ou senha inválidos';

    } finally {
      this.loading = false;
    }
  }
}
