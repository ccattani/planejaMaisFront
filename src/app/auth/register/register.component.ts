import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegisterPayload } from '../../interfaces/register';
import { ServicesService } from '../../service/services.service';
import { AuthCardComponent } from '../components/auth-card/auth-card.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AuthCardComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  form = {
    name: '',
    user: '',
    email: '',
    birthday: '',
    password: ''
  };

  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(private service: ServicesService) {}

  async submit() {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';
    const now = new Date().toISOString();

    const payload: RegisterPayload = {
      name: this.form.name,
      user: this.form.user,
      email: this.form.email,
      lastEmail: this.form.email,
      birthday: new Date(this.form.birthday).toISOString(),
      passwordHash: this.form.password,
      createdAt: now,
      updatedAt: now,
      isActive: false
    };

    try {
      await this.service.createAccount(payload);
      await this.service.sendAuthEmail();
      this.successMsg = 'Conta criada com sucesso! Enviamos um e-mail de ativação.';
    } catch (err: any) {
      this.errorMsg = err.error?.message || 'Erro ao criar conta';
    } finally {
      this.loading = false;
    }
  }
}
