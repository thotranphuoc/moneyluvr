import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule
  ],
  template: `
    @if (!data.initialized()) {
      <div class="loading">
        <span class="loading-dot"></span>
        <p>{{ 'common.loadingData' | translate }}</p>
      </div>
    } @else {
    <mat-toolbar class="toolbar">
      <a class="logo" routerLink="/">{{ title }}</a>
      <span class="spacer"></span>
      <div class="nav-links">
        <a routerLink="/dashboard" routerLinkActive="active">{{ 'nav.overview' | translate }}</a>
        <a routerLink="/income" routerLinkActive="active">{{ 'nav.income' | translate }}</a>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">{{ 'nav.expense' | translate }}</a>
        <a routerLink="/budget" routerLinkActive="active">{{ 'nav.budget' | translate }}</a>
        <a routerLink="/settings" routerLinkActive="active">{{ 'nav.settings' | translate }}</a>
      </div>
    </mat-toolbar>
    <main class="content">
      <div class="content-inner">
        <router-outlet></router-outlet>
      </div>
    </main>
    <nav class="bottom-nav">
      <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
        <mat-icon>dashboard</mat-icon>
        <span>{{ 'nav.overview' | translate }}</span>
      </a>
      <a routerLink="/income" routerLinkActive="active" class="nav-item">
        <mat-icon>trending_up</mat-icon>
        <span>{{ 'nav.income' | translate }}</span>
      </a>
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
        <mat-icon>trending_down</mat-icon>
        <span>{{ 'nav.expense' | translate }}</span>
      </a>
      <a routerLink="/budget" routerLinkActive="active" class="nav-item">
        <mat-icon>account_balance_wallet</mat-icon>
        <span>{{ 'nav.budget' | translate }}</span>
      </a>
      <a routerLink="/settings" routerLinkActive="active" class="nav-item">
        <mat-icon>settings</mat-icon>
        <span>{{ 'nav.settings' | translate }}</span>
      </a>
    </nav>
    }
  `,
  styles: [`
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      gap: 1rem;
      color: var(--ml-text-muted);
      font-size: 0.9375rem;
    }
    .loading-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--ml-primary);
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      height: 56px;
      padding: 0 1.5rem;
      background: var(--ml-bg-card);
      border-bottom: 1px solid var(--ml-border);
      box-shadow: var(--ml-shadow);
      min-width: 0;
    }
    .logo {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--ml-primary);
      text-decoration: none;
      transition: color 0.2s;
      max-width: 50%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .logo:hover { color: var(--ml-primary-dark); }
    .spacer { flex: 1 1 auto; min-width: 0; }
    .nav-links {
      display: flex;
      gap: 0.25rem;
      flex-shrink: 0;
    }
    .nav-links a {
      padding: 0.5rem 0.75rem;
      border-radius: var(--ml-radius);
      color: var(--ml-text-muted);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
      transition: background 0.2s, color 0.2s;
    }
    .nav-links a:hover {
      color: var(--ml-text);
      background: var(--ml-bg);
    }
    .nav-links a.active {
      color: var(--ml-primary);
      background: color-mix(in srgb, var(--ml-primary) 12%, transparent);
    }
    .content {
      max-width: 56rem;
      margin: 0 auto;
      padding: 1.5rem 1rem;
      min-height: calc(100vh - 56px);
    }
    .content-inner {
      animation: contentFadeIn 0.25s ease-out;
    }
    @keyframes contentFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--ml-bg-card);
      padding: 0.5rem 0.5rem max(0.5rem, env(safe-area-inset-bottom));
      justify-content: space-around;
      align-items: center;
      z-index: 10;
      border-top: 1px solid var(--ml-border);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
    }
    .bottom-nav .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      color: var(--ml-text-muted);
      text-decoration: none;
      padding: 0.5rem 0.75rem;
      border-radius: var(--ml-radius);
      transition: background 0.2s, color 0.2s;
      min-width: 0;
      flex: 1 1 0;
      max-width: 25%;
    }
    .bottom-nav .nav-item mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }
    .bottom-nav .nav-item span {
      font-size: 0.6875rem;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    .bottom-nav .nav-item:hover {
      color: var(--ml-text);
      background: var(--ml-bg);
    }
    .bottom-nav .nav-item.active {
      color: var(--ml-primary);
      background: color-mix(in srgb, var(--ml-primary) 12%, transparent);
    }
    .bottom-nav .nav-item.active mat-icon {
      color: inherit;
    }
    @media (max-width: 600px) {
      .nav-links { display: none; }
      .bottom-nav { display: flex; }
      .content { padding-bottom: 5.5rem; }
    }
  `]
})
export class LayoutComponent implements OnInit {
  title = 'MoneyLuvr';
  data = inject(DataService);
  private auth = inject(AuthService);

  ngOnInit(): void {
    const user = this.auth.user();
    if (user && !this.data.initialized()) {
      this.data.init(user.id);
    }
  }
}
