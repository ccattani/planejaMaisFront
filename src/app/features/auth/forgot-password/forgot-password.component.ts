import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../../core/service/services.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  successMsg = '';
  errorMsg = '';

  constructor(private service: ServicesService) {}

  async submit() {
    if (this.loading) return;

    this.successMsg = '';
    this.errorMsg = '';

    const email = this.email.trim();
    if (!email) {
      this.errorMsg = 'Informe um e-mail válido.';
      return;
    }

    this.loading = true;

    try {
      await this.service.getForgottenPassword(email);
      this.successMsg = 'Link de recuperação enviado com sucesso.';
    } catch (err: any) {
      this.errorMsg =
        err?.error?.message ||
        err?.error ||
        'Falha ao enviar o link. Tente novamente.';
    } finally {
      this.loading = false;
    }
  }
}
