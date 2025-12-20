import { Routes } from '@angular/router';


export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule),
  },

  {
    path: 'auth/change-password/:token',
    loadComponent: () => import('./features/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent),
  },

  {
    path: 'auth/confirm-account/:token',
    loadComponent: () => import('./features/auth/confirm-account/confirm-account.component').then(m => m.ConfirmAccountComponent),
  },

  {
  path: 'profile',
  loadComponent: () => import('./features/dashboard/profile/profile.component').then(m => m.ProfileComponent),
  }

];


