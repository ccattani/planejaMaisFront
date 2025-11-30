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
  error = '';
  success = '';

  constructor(private service: ServicesService) {}

  async submit() {
    this.loading = true;
    this.error = '';
    this.success = '';
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
      isActive: true
    };

    try {
      await this.service.createAccount(payload);
      this.success = 'Conta criada com sucesso!';
    } catch (err: any) {
      this.error = err.error?.message || 'Erro ao criar conta';
    } finally {
      this.loading = false;
    }
  }
}
