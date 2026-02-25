import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../core/auth.service';

const BODY_AUTH_CLASS = 'ml-auth-page';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTabsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="auth-page">
      <div class="auth-bg"></div>
      <mat-card class="auth-card ml-card">
        <div class="auth-card-inner">
          <div class="auth-brand">
            <span class="auth-logo">MoneyLuvr</span>
            <p class="auth-tagline">{{ 'auth.tagline' | translate }}</p>
          </div>
          <mat-tab-group class="auth-tabs" (selectedIndexChange)="tabIndex.set($event)">
            <mat-tab [label]="'auth.login' | translate">
              <form class="auth-form" (ngSubmit)="login()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'auth.email' | translate }}</mat-label>
                  <input matInput type="email" [(ngModel)]="email" name="email" required />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'auth.password' | translate }}</mat-label>
                  <input matInput type="password" [(ngModel)]="password" name="password" required />
                </mat-form-field>
                <button mat-flat-button color="primary" class="btn-primary" type="submit" [disabled]="loading()">{{ 'auth.login' | translate }}</button>
                <button mat-button type="button" class="btn-link" (click)="showForgot()">{{ 'auth.forgotPassword' | translate }}</button>
              </form>
            </mat-tab>
            <mat-tab [label]="'auth.register' | translate">
              <form class="auth-form" (ngSubmit)="register()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'auth.email' | translate }}</mat-label>
                  <input matInput type="email" [(ngModel)]="email" name="emailReg" required />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'auth.passwordMin' | translate }}</mat-label>
                  <input matInput type="password" [(ngModel)]="password" name="passwordReg" minlength="6" required />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'auth.confirmPassword' | translate }}</mat-label>
                  <input matInput type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required />
                </mat-form-field>
                <button mat-flat-button color="primary" class="btn-primary" type="submit" [disabled]="loading() || password !== confirmPassword">{{ 'auth.register' | translate }}</button>
              </form>
            </mat-tab>
          </mat-tab-group>
          @if (forgotMode()) {
            <div class="forgot-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'auth.resetEmail' | translate }}</mat-label>
                <input matInput type="email" [(ngModel)]="email" name="forgotEmail" />
              </mat-form-field>
              <div class="forgot-actions">
                <button mat-flat-button color="primary" (click)="sendReset()" [disabled]="loading()">{{ 'auth.sendEmail' | translate }}</button>
                <button mat-button (click)="forgotMode.set(false)">{{ 'common.cancel' | translate }}</button>
              </div>
            </div>
          }
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
    }
    .auth-page {
      min-height: 100%;
      height: 100%;
      max-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }
    .auth-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(160deg, var(--ml-bg) 0%, rgba(13, 148, 136, 0.06) 50%, var(--ml-bg) 100%);
      pointer-events: none;
    }
    .auth-card {
      position: relative;
      max-width: 420px;
      width: 100%;
      max-height: calc(100vh - 2rem);
      border-radius: var(--ml-radius-lg);
      box-shadow: var(--ml-shadow-lg);
      overflow: hidden;
      box-sizing: border-box;
    }
    .auth-card-inner {
      padding: 1.25rem 1.5rem;
      overflow: hidden;
      max-height: calc(100vh - 4rem);
      box-sizing: border-box;
    }
    .auth-brand {
      text-align: center;
      margin-bottom: 1rem;
    }
    .auth-logo {
      display: block;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--ml-primary);
      margin-bottom: 0.25rem;
    }
    .auth-tagline {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ml-text-muted);
      font-weight: 400;
    }
    .auth-tabs ::ng-deep .mat-mdc-tab-header { margin-bottom: 0.25rem; }
    .auth-tabs ::ng-deep .mat-mdc-tab-labels { justify-content: center; }
    .auth-tabs ::ng-deep .mat-mdc-tab { min-width: auto; padding: 0 1.25rem; }
    .auth-tabs ::ng-deep .mat-mdc-tab-body-content { overflow: hidden !important; }
    .auth-form, .forgot-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 0.25rem;
    }
    .full-width { width: 100%; }
    .btn-primary {
      margin-top: 0.5rem;
      padding: 0.5rem 1.5rem;
      font-weight: 600;
      text-transform: none;
      border-radius: var(--ml-radius);
    }
    .btn-link {
      margin-top: 0.25rem;
      color: var(--ml-text-muted);
      text-transform: none;
    }
    .forgot-actions { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem; }
  `]
})
export class AuthComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  forgotMode = signal(false);
  tabIndex = signal(0);

  private doc = inject(DOCUMENT);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  ngOnInit(): void {
    this.doc.body.classList.add(BODY_AUTH_CLASS);
  }

  ngOnDestroy(): void {
    this.doc.body.classList.remove(BODY_AUTH_CLASS);
  }

  showForgot(): void {
    this.forgotMode.set(true);
  }

  async login(): Promise<void> {
    if (!this.email?.trim() || !this.password) return;
    this.loading.set(true);
    try {
      await this.auth.login(this.email.trim(), this.password);
      this.snackBar.open(this.translate.instant('messages.loginSuccess'), '', { duration: 3000 });
      this.router.navigate(['/']);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : this.translate.instant('common.error');
      this.snackBar.open(msg, '', { duration: 4000 });
    } finally {
      this.loading.set(false);
    }
  }

  async register(): Promise<void> {
    if (!this.email?.trim() || !this.password) return;
    if (this.password.length < 6) {
      this.snackBar.open(this.translate.instant('messages.passwordMinError'), '', { duration: 3000 });
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.snackBar.open(this.translate.instant('messages.confirmPasswordMismatch'), '', { duration: 3000 });
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.register(this.email.trim(), this.password);
      this.snackBar.open(this.translate.instant('messages.registerSuccess'), '', { duration: 4000 });
      this.router.navigate(['/']);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : this.translate.instant('common.error');
      this.snackBar.open(msg.includes('already') ? this.translate.instant('messages.emailAlreadyRegistered') : msg, '', { duration: 4000 });
    } finally {
      this.loading.set(false);
    }
  }

  async sendReset(): Promise<void> {
    if (!this.email?.trim()) return;
    this.loading.set(true);
    try {
      await this.auth.sendPasswordResetEmail(this.email.trim());
      this.snackBar.open(this.translate.instant('messages.resetEmailSent'), '', { duration: 4000 });
      this.forgotMode.set(false);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : this.translate.instant('common.error');
      this.snackBar.open(msg, '', { duration: 4000 });
    } finally {
      this.loading.set(false);
    }
  }
}
