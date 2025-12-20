import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ServicesService } from '../../../core/service/services.service';
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

  user = '';
  msg = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private service: ServicesService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.route.snapshot.paramMap.get('token') || '';
  }

  async confirm() {
  try {
    let token = await this.service.sendAuthEmail(this.user);
  console.log(token);
    // token = token.replace(/"/g, "");
    // redireciona para login com token
    this.router.navigate(['/auth/login'], { queryParams: { activation: token } });

  } catch {
    alert('Erro ao confirmar sua conta. Tente novamente.');
  }
}
}
