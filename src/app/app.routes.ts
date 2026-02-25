import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'auth', loadComponent: () => import('./auth/auth.component').then(m => m.AuthComponent) },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/expense/expense.component').then(m => m.ExpenseComponent) },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'income', loadComponent: () => import('./pages/income/income.component').then(m => m.IncomeComponent) },
      { path: 'expense', loadComponent: () => import('./pages/expense/expense.component').then(m => m.ExpenseComponent) },
      { path: 'budget', loadComponent: () => import('./pages/budget/budget.component').then(m => m.BudgetComponent) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent) }
    ]
  },
  { path: 'categories', redirectTo: 'settings', pathMatch: 'full' },
  { path: 'transactions', redirectTo: 'expense', pathMatch: 'full' },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
