import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";

@Component({
  selector: "app-landing",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./landing.component.html",
  styleUrl: "./landing.component.scss",
})
export class LandingComponent implements OnInit, OnDestroy {
  kpis = [
    { label: "Transações organizadas", value: 1240, current: 0, suffix: "+" },
    { label: "Metas criadas", value: 36, current: 0, suffix: "" },
    { label: "Economia potencial", value: 18, current: 0, suffix: "%" },
  ];

  currentYear = new Date().getFullYear();

  private rafId: number | null = null;
  private router = inject(Router);

  ngOnInit(): void {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      this.router.navigateByUrl("/home");
      return;
    }
    // anima KPI quando a página carrega (simples e eficiente)
    const start = performance.now();
    const duration = 900;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic

      this.kpis = this.kpis.map((k) => ({
        ...k,
        current: Math.round(k.value * eased),
      }));

      if (p < 1) this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
