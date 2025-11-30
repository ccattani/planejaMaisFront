import { Routes } from '@angular/router';
import { HomeComponent } from './dashboard/home/home.component';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
  },

  {
  path: 'profile',
  loadComponent: () => import('./dashboard/profile/profile.component').then(m => m.ProfileComponent),
  }

];


