import { Routes } from "@angular/router";
import { DashboardLayoutComponent } from "./features/dashboard/dashboard-layout/dashboard-layout.component";

export const routes: Routes = [
  { path: "", redirectTo: "auth/login", pathMatch: "full" },

  {
    path: "auth",
    loadChildren: () =>
      import("./features/auth/auth.module").then((m) => m.AuthModule),
  },

  {
    path: "auth/change-password/:token",
    loadComponent: () =>
      import("./features/auth/change-password/change-password.component").then(
        (m) => m.ChangePasswordComponent
      ),
  },

  {
    path: "auth/confirm-account/:token",
    loadComponent: () =>
      import("./features/auth/confirm-account/confirm-account.component").then(
        (m) => m.ConfirmAccountComponent
      ),
  },

{
  path: "",
  component: DashboardLayoutComponent,
  children: [
    { path: "home", loadComponent: () => import("./features/dashboard/home/home.component").then(m => m.HomeComponent) },
    { path: "transactions", loadComponent: () => import("./features/dashboard/transacoes/transacoes.component").then(m => m.TransacoesComponent) },
    // { path: "goals", loadComponent: () => import("./features/dashboard/goals/goals.component").then(m => m.GoalsComponent) },
    // { path: "reports", loadComponent: () => import("./features/dashboard/reports/reports.component").then(m => m.ReportsComponent) },
    { path: "profile", loadComponent: () => import("./features/dashboard/profile/profile.component").then(m => m.ProfileComponent) },
    { path: "", pathMatch: "full", redirectTo: "home" },
  ],
}
];
