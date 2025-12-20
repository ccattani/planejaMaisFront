import { Component, OnInit } from "@angular/core";
import { ServicesService } from "../../../core/service/services.service";
import { AuthCardComponent } from "../components/auth-card/auth-card.component";
import { RouterModule, ActivatedRoute } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-change-password",
  templateUrl: "./change-password.component.html",
  standalone: true,
  imports: [AuthCardComponent, RouterModule, FormsModule, CommonModule],
  styleUrls: ["./change-password.component.scss"],
})
export class ChangePasswordComponent implements OnInit {

  newPassword = "";
  confirmPassword = "";

  resetToken = "";

  loading = false;
  successMsg = "";
  errorMsg = "";

  constructor(
    private service: ServicesService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // pega o token da URL
    this.resetToken = this.route.snapshot.paramMap.get('token') || "";

    if (!this.resetToken) {
      this.errorMsg = "Token inválido.";
    }
  }

  async submit() {

    this.successMsg = "";
    this.errorMsg = "";
    this.loading = true;

    if (!this.newPassword.trim() || !this.confirmPassword.trim()) {
      this.errorMsg = "Preencha todos os campos.";
      this.loading = false;
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg = "As senhas não conferem.";
      this.loading = false;
      return;
    }

    try {
      const payload = {
        passwordHash: this.newPassword
      };

      await this.service.newPassword(payload, this.resetToken);

      this.successMsg = "Senha atualizada com sucesso.";
    } catch (error) {
      this.errorMsg = "Erro ao atualizar a senha.";
    } finally {
      this.loading = false;
    }
  }
}
