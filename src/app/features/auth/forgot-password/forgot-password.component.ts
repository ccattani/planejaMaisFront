import { Component } from '@angular/core';
import { AuthCardComponent } from "../components/auth-card/auth-card.component";
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../../core/service/services.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [AuthCardComponent, RouterModule, FormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {

  email = '';
  loading = false;
  successMsg = '';
  errorMsg = '';

  constructor(private service: ServicesService) {}

  async submit() {
    // reset state
    this.successMsg = '';
    this.errorMsg = '';
    this.loading = true;

    // regra de ouro: e-mail vazio nem entra no pipeline
    if (!this.email.trim()) {
      this.loading = false;
      this.errorMsg = 'Informe um e-mail válido.';
      return;
    }

    try {
      await this.service.getForgottenPassword(this.email);

      this.successMsg = 'Link de recuperação enviado com sucesso.';
    } catch (error: any) {
      console.error('[ForgotPassword] Falha na operação:', error);
      this.errorMsg = error?.error?.message || 'Falha ao enviar o link. Tente novamente.';
    } finally {
      this.loading = false;
    }
  }
}
