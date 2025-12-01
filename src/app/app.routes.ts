import { Routes } from '@angular/router';


export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
  },

  {
    path: 'auth/change-password/:token',
    loadComponent: () => import('./auth/change-password/change-password.component').then(m => m.ChangePasswordComponent),
  },

  {
    path: 'auth/confirm-account/:token',
    loadComponent: () => import('./auth/confirm-account/confirm-account.component').then(m => m.ConfirmAccountComponent),
  },

  {
  path: 'profile',
  loadComponent: () => import('./dashboard/profile/profile.component').then(m => m.ProfileComponent),
  }

];


