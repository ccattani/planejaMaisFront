import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ServicesService } from '../../service/services.service';
import { AuthCardComponent } from '../components/auth-card/auth-card.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-account',
  standalone: true,
  templateUrl: './confirm-account.component.html',
  imports: [AuthCardComponent, RouterModule, FormsModule, CommonModule],
  styleUrl: './confirm-account.component.scss'
})
export class ConfirmAccountComponent {

  token = '';
  msg = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private service: ServicesService,
    private router: Router
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
  }

  async confirm() {
    this.loading = true;

    try {
      await this.service.confirmAccount(this.token);

      this.msg = "Conta ativada com sucesso!";

      // redirecionar ao login após 1s
      setTimeout(() => {
        this.router.navigate(['/auth/login'], {
          queryParams: { activated: true }
        });
      }, 1000);

    } catch(err) {
      this.msg = "Erro ao ativar sua conta. Link inválido ou expirado.";
    } finally {
      this.loading = false;
    }
  }
}
