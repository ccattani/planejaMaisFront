import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthCardComponent } from "../components/auth-card/auth-card.component";
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

async submit() {
  this.loading = true;
  this.error = '';

  try {
    let token = await this.service.login(this.form);

    token = token.replace(/"/g, "");

    if (this.form.remember) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }

    this.router.navigate(['/profile']);

  } catch (err: any) {

    // ---- CHECK DO isActive ----
    if (err.error === 'Conta não verificada') {

      try {
        await this.service.sendAuthEmail();
        this.error = 'Sua conta ainda não foi ativada. Enviamos um e-mail para você confirmar.';
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


}
