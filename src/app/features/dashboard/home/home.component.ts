import { Component } from "@angular/core";
import { ServicesService } from "../../core/service/services.service";
import { Router } from "@angular/router";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent {
  constructor(private service: ServicesService, private router: Router) {}

  ngOnInit() {
    this.loadUser();
  }

  async loadUser() {
    try {
      const data = await this.service.getMyAccount();
      console.log("Minha conta:", data);
    } catch (err) {
      console.error("Erro ao carregar conta:", err);
    }
  }
}
