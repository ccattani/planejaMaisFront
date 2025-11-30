import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ServicesService } from "../../service/services.service";
import { Router, RouterModule } from "@angular/router";
import { UpdatePayload } from "../../interfaces/update";

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: "./profile.component.html",
  styleUrls: ["./profile.component.scss"],
})
export class ProfileComponent implements OnInit {
  userData: any = {};
  loading = false;
  successMsg = "";
  errorMsg = "";

  constructor(private service: ServicesService, private router: Router) {}

  async ngOnInit() {
    this.loading = true;
    try {
      this.userData = await this.service.getMyAccount();
    } catch (err) {
      console.error(err);
      this.errorMsg = "Erro ao carregar dados do usuário.";
    } finally {
      this.loading = false;
    }
  }

  async updateProfile() {
    this.successMsg = "";
    this.errorMsg = "";

    try {
      const payload: UpdatePayload = {
        name: this.userData.name,
        user: this.userData.user,
        email: this.userData.email,
        lastEmail: this.userData.lastEmail,
        birthday: this.userData.birthday,
        passwordHash: this.userData.passwordHash,
        createdAt: this.userData.createdAt,
        updatedAt: new Date().toISOString(),
        isActive: this.userData.isActive,
      };
      await this.service.updateUser(payload);
      this.successMsg = "Perfil atualizado com sucesso.";
    } catch (err) {
      console.error(err);
      this.errorMsg = "Erro ao atualizar o perfil.";
    }
  }

  async deleteAccount() {
    if (!confirm("Tem certeza? Essa operação não pode ser desfeita.")) return;

    try {
      await this.service.deleteUser();
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(["/auth/login"]);
    } catch (err) {
      console.error(err);
      this.errorMsg = "Erro ao excluir conta.";
    }
  }
}
