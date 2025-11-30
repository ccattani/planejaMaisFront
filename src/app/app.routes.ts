import { ChangePasswordComponent } from './auth/change-password/change-password.component';
import { Routes } from '@angular/router';
import { HomeComponent } from './dashboard/home/home.component';

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
  path: 'profile',
  loadComponent: () => import('./dashboard/profile/profile.component').then(m => m.ProfileComponent),
  }

];


