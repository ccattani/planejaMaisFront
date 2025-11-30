import { Component, OnInit } from "@angular/core";
import { ServicesService } from "../../service/services.service";
import { AuthCardComponent } from "../components/auth-card/auth-card.component";
import { RouterModule } from "@angular/router";
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
  user = "";
  newPassword = "";
  confirmPassword = "";

  loading = false;
  successMsg = "";
  errorMsg = "";

  constructor(private service: ServicesService) {}

  ngOnInit() {}

  async submit() {
    this.successMsg = "";
    this.errorMsg = "";
    this.loading = true;

    // validações de praxe
    if (
      !this.user.trim() ||
      !this.newPassword.trim() ||
      !this.confirmPassword.trim()
    ) {
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
        user: this.user,
        passwordHash: this.newPassword,
      };

      await this.service.newPassword(payload);

      this.successMsg = "Senha atualizada com sucesso.";
    } catch (error) {
      console.error("[ResetPassword] Erro:", error);
      this.errorMsg = "Erro ao atualizar a senha.";
    } finally {
      this.loading = false;
    }
  }
}
