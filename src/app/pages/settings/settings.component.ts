import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { UtilsService } from '../../core/utils.service';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import type { Category, Wallet } from '../../models';
import type { CategoryType } from '../../models';
import type { Transaction } from '../../models';

const LANG_STORAGE = 'moneyluvr_lang';

const CATEGORY_COLORS = [
  '#0d9488', '#059669', '#2563eb', '#7c3aed', '#db2777',
  '#ea580c', '#ca8a04', '#64748b'
];

const THEME_PRIMARY_OPTIONS: { name: string; hex: string }[] = [
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Rose', hex: '#db2777' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Amber', hex: '#ca8a04' },
  { name: 'Slate', hex: '#64748b' },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    DragDropModule,
    TranslateModule
  ],
  template: `
    <h1 class="page-header">{{ 'pages.settings' | translate }}</h1>

    <!-- Tài khoản -->
    <mat-card class="ml-card settings-card">
      <mat-card-header>
        <mat-card-title>{{ 'settings.account' | translate }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="settings-desc">{{ 'settings.accountDesc' | translate }}</p>
        <button mat-flat-button color="warn" class="btn-logout" (click)="logout()">{{ 'settings.logout' | translate }}</button>
      </mat-card-content>
    </mat-card>

    <!-- Export giao dịch -->
    <mat-card class="ml-card settings-card">
      <mat-card-header>
        <mat-card-title>{{ 'settings.exportTransactions' | translate }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="settings-desc">{{ 'settings.exportTransactionsDesc' | translate }}</p>
        <div class="export-date-row">
          <mat-form-field appearance="outline" class="export-field">
            <mat-label>{{ 'common.fromDate' | translate }}</mat-label>
            <input matInput [matDatepicker]="exportFromPicker" [(ngModel)]="exportFromDate" />
            <mat-datepicker #exportFromPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="export-field">
            <mat-label>{{ 'common.toDate' | translate }}</mat-label>
            <input matInput [matDatepicker]="exportToPicker" [(ngModel)]="exportToDate" />
            <mat-datepicker #exportToPicker></mat-datepicker>
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="downloadTransactions()" [disabled]="exporting()">
            <mat-icon>download</mat-icon> {{ 'settings.downloadTransactions' | translate }}
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Giao diện -->
    <mat-card class="ml-card settings-card">
      <mat-card-header>
        <mat-card-title>{{ 'settings.appearance' | translate }}</mat-card-title>
      </mat-card-header>
      <mat-card-content class="settings-options">
        <div class="setting-row">
          <span class="setting-label">{{ 'settings.darkMode' | translate }}</span>
          <mat-slide-toggle [checked]="data.darkMode()" (change)="data.setDarkMode($event.checked)"></mat-slide-toggle>
        </div>
        <div class="setting-row setting-row-block">
          <span class="setting-label">{{ 'settings.primaryColor' | translate }}</span>
          <div class="primary-swatches">
            @for (opt of themePrimaryOptions; track opt.hex) {
              <button
                type="button"
                class="primary-swatch"
                [class.primary-swatch--selected]="(data.primaryColor() || '').toLowerCase() === opt.hex.toLowerCase()"
                [style.background]="opt.hex"
                [attr.aria-label]="opt.name"
                [attr.title]="opt.name"
                (click)="data.setPrimaryColor(opt.hex)"
              >
                @if ((data.primaryColor() || '').toLowerCase() === opt.hex.toLowerCase()) {
                  <mat-icon class="swatch-check">check</mat-icon>
                }
              </button>
            }
          </div>
          <div class="primary-color-picker-wrap">
            <span class="color-picker-label">{{ 'settings.orPickColor' | translate }}</span>
            <input
              type="color"
              class="primary-color-picker"
              [value]="primaryColorForPicker()"
              (input)="onPrimaryColorInput($event)"
              [attr.aria-label]="'settings.primaryColor' | translate"
            />
          </div>
        </div>
        <div class="setting-row setting-row-block">
          <span class="setting-label">{{ 'settings.language' | translate }}</span>
          <div class="language-tabs">
            <button mat-button (click)="setLanguage('vi')" [class.active]="currentLang() === 'vi'">Tiếng Việt</button>
            <button mat-button (click)="setLanguage('en')" [class.active]="currentLang() === 'en'">English</button>
          </div>
        </div>
        <mat-form-field appearance="outline" class="currency-field">
          <mat-label>{{ 'settings.defaultCurrency' | translate }}</mat-label>
          <mat-select [value]="data.currency()" (selectionChange)="data.setCurrency($event.value)">
            @for (c of data.supportedCurrencies(); track c) {
              <mat-option [value]="c">{{ c }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="setting-row setting-row-block">
          <span class="setting-label">{{ 'settings.currenciesList' | translate }}</span>
          <p class="settings-desc">{{ 'settings.currenciesListDesc' | translate }}</p>
          <ul class="item-list" cdkDropList (cdkDropListDropped)="onCurrencyDrop($event)">
            @for (c of data.supportedCurrencies(); track c) {
              <li class="item-row" cdkDrag>
                <mat-icon class="drag-handle" cdkDragHandle>drag_indicator</mat-icon>
                <span class="item-name">{{ c }}</span>
                <button mat-icon-button color="warn" (click)="removeCurrency(c)" [attr.aria-label]="'common.delete' | translate" [disabled]="data.supportedCurrencies().length <= 1"><mat-icon>delete</mat-icon></button>
              </li>
            }
          </ul>
          <div class="add-currency-form">
            <mat-form-field appearance="outline" class="currency-code-field">
              <mat-label>{{ 'settings.currencyCode' | translate }}</mat-label>
              <input matInput [(ngModel)]="newCurrencyCode" (keydown.enter)="addCurrency()" maxlength="10" placeholder="JPY" />
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="addCurrency()">{{ 'common.add' | translate }}</button>
          </div>
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Ví / Tài khoản -->
    <mat-card class="ml-card settings-card">
      <mat-card-header>
        <mat-card-title>{{ 'settings.walletsTitle' | translate }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="settings-desc">{{ 'settings.walletsDesc' | translate }}</p>
        <ul class="item-list" cdkDropList (cdkDropListDropped)="onWalletDrop($event)">
          @for (w of data.wallets(); track w.id) {
            @if (editingWalletId() === w.id) {
              <li class="item-row edit-row" cdkDrag>
                <input class="edit-input" [(ngModel)]="walletName" (keydown.enter)="saveWallet()" (keydown.escape)="cancelEditWallet()" />
                <button mat-icon-button (click)="saveWallet()" [attr.aria-label]="'common.save' | translate"><mat-icon>check</mat-icon></button>
                <button mat-icon-button (click)="cancelEditWallet()" [attr.aria-label]="'common.cancel' | translate"><mat-icon>close</mat-icon></button>
              </li>
            } @else {
              <li class="item-row" cdkDrag>
                <span class="item-name">{{ w.name }}</span>
                <button mat-icon-button (click)="startEditWallet(w)" [attr.aria-label]="'common.edit' | translate"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button color="warn" (click)="deleteWallet(w.id)" [attr.aria-label]="'common.delete' | translate"><mat-icon>delete</mat-icon></button>
              </li>
            }
          }
        </ul>
        @if (showWalletForm()) {
          <div class="add-form">
            <mat-form-field appearance="outline" class="add-field">
              <mat-label>{{ 'settings.walletName' | translate }}</mat-label>
              <input matInput [(ngModel)]="newWalletName" (keydown.enter)="addWallet()" />
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="addWallet()">{{ 'common.add' | translate }}</button>
            <button mat-button (click)="showWalletForm.set(false)">{{ 'common.cancel' | translate }}</button>
          </div>
        } @else {
          <button mat-stroked-button (click)="showWalletForm.set(true)" class="btn-add-item">
            <mat-icon>add</mat-icon> {{ 'settings.addWallet' | translate }}
          </button>
        }
      </mat-card-content>
    </mat-card>

    <!-- Danh mục thu nhập -->
    <mat-card class="ml-card settings-card">
      <mat-card-header>
        <mat-card-title>{{ 'settings.incomeCategoriesTitle' | translate }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="settings-desc">{{ 'settings.incomeCategoriesDesc' | translate }}</p>
        <ul class="item-list" cdkDropList (cdkDropListDropped)="onIncomeCategoryDrop($event)">
          @for (c of incomeCategories(); track c.id) {
            @if (editingCategoryId() === c.id) {
              <li class="item-row edit-row" cdkDrag>
                <span class="color-dot" [style.background]="editCategoryColorValue"></span>
                <input class="edit-input" [(ngModel)]="editCategoryName" (keydown.enter)="saveCategory()" (keydown.escape)="cancelEditCategory()" />
                <select class="color-select-inline" [(ngModel)]="editCategoryColorValue">
                  @for (col of categoryColors; track col) {
                    <option [value]="col">{{ col }}</option>
                  }
                </select>
                <button mat-icon-button (click)="saveCategory()" [attr.aria-label]="'common.save' | translate"><mat-icon>check</mat-icon></button>
                <button mat-icon-button (click)="cancelEditCategory()" [attr.aria-label]="'common.cancel' | translate"><mat-icon>close</mat-icon></button>
              </li>
            } @else {
              <li class="item-row" cdkDrag>
                <span class="color-dot" [style.background]="c.color || '#0d9488'"></span>
                <span class="item-name">{{ isUncategorizedCategory(c) ? ('categories.uncategorized' | translate) : c.name }}</span>
                @if (!isUncategorizedCategory(c)) {
                  <button mat-icon-button (click)="startEditCategory(c)" [attr.aria-label]="'common.edit' | translate"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteCategory(c)" [attr.aria-label]="'common.delete' | translate"><mat-icon>delete</mat-icon></button>
                }
              </li>
            }
          }
        </ul>
        @if (showIncomeForm()) {
          <div class="add-form">
            <mat-form-field appearance="outline" class="add-field">
              <mat-label>{{ 'settings.categoryName' | translate }}</mat-label>
              <input matInput [(ngModel)]="newCategoryName" (keydown.enter)="addCategory('income')" />
            </mat-form-field>
            <span class="color-picker-label">{{ 'common.color' | translate }}:</span>
            <select class="color-select-inline" [(ngModel)]="newCategoryColor">
              @for (col of categoryColors; track col) {
                <option [value]="col">{{ col }}</option>
              }
            </select>
            <div class="add-form-actions">
              <button mat-flat-button color="primary" (click)="addCategory('income')">{{ 'common.add' | translate }}</button>
              <button mat-button (click)="showIncomeForm.set(false)">{{ 'common.cancel' | translate }}</button>
            </div>
          </div>
        } @else {
          <button mat-stroked-button (click)="showIncomeForm.set(true)" class="btn-add-item">
            <mat-icon>add</mat-icon> {{ 'settings.addIncomeCategory' | translate }}
          </button>
        }
      </mat-card-content>
    </mat-card>

    <!-- Danh mục chi tiêu -->
    <mat-card class="ml-card settings-card">
      <mat-card-header>
        <mat-card-title>{{ 'settings.expenseCategoriesTitle' | translate }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p class="settings-desc">{{ 'settings.expenseCategoriesDesc' | translate }}</p>
        <ul class="item-list" cdkDropList (cdkDropListDropped)="onExpenseCategoryDrop($event)">
          @for (c of expenseCategories(); track c.id) {
            @if (editingCategoryId() === c.id) {
              <li class="item-row edit-row" cdkDrag>
                <span class="color-dot" [style.background]="editCategoryColorValue"></span>
                <input class="edit-input" [(ngModel)]="editCategoryName" (keydown.enter)="saveCategory()" (keydown.escape)="cancelEditCategory()" />
                <select class="color-select-inline" [(ngModel)]="editCategoryColorValue">
                  @for (col of categoryColors; track col) {
                    <option [value]="col">{{ col }}</option>
                  }
                </select>
                <button mat-icon-button (click)="saveCategory()" [attr.aria-label]="'common.save' | translate"><mat-icon>check</mat-icon></button>
                <button mat-icon-button (click)="cancelEditCategory()" [attr.aria-label]="'common.cancel' | translate"><mat-icon>close</mat-icon></button>
              </li>
            } @else {
              <li class="item-row" cdkDrag>
                <span class="color-dot" [style.background]="c.color || '#0d9488'"></span>
                <span class="item-name">{{ isUncategorizedCategory(c) ? ('categories.uncategorized' | translate) : c.name }}</span>
                @if (!isUncategorizedCategory(c)) {
                  <button mat-icon-button (click)="startEditCategory(c)" [attr.aria-label]="'common.edit' | translate"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteCategory(c)" [attr.aria-label]="'common.delete' | translate"><mat-icon>delete</mat-icon></button>
                }
              </li>
            }
          }
        </ul>
        @if (showExpenseForm()) {
          <div class="add-form">
            <mat-form-field appearance="outline" class="add-field">
              <mat-label>{{ 'settings.categoryName' | translate }}</mat-label>
              <input matInput [(ngModel)]="newCategoryName" (keydown.enter)="addCategory('expense')" />
            </mat-form-field>
            <span class="color-picker-label">{{ 'common.color' | translate }}:</span>
            <select class="color-select-inline" [(ngModel)]="newCategoryColor">
              @for (col of categoryColors; track col) {
                <option [value]="col">{{ col }}</option>
              }
            </select>
            <div class="add-form-actions">
              <button mat-flat-button color="primary" (click)="addCategory('expense')">{{ 'common.add' | translate }}</button>
              <button mat-button (click)="showExpenseForm.set(false)">{{ 'common.cancel' | translate }}</button>
            </div>
          </div>
        } @else {
          <button mat-stroked-button (click)="showExpenseForm.set(true)" class="btn-add-item">
            <mat-icon>add</mat-icon> {{ 'settings.addExpenseCategory' | translate }}
          </button>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .settings-card { margin-bottom: 1.25rem; }
    .settings-card .mat-mdc-card-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--ml-text);
    }
    .settings-desc {
      margin: 0 0 1rem 0;
      font-size: 0.875rem;
      color: var(--ml-text-muted);
      line-height: 1.5;
      overflow-wrap: break-word;
    }
    .btn-logout { text-transform: none; font-weight: 600; border-radius: var(--ml-radius); }
    .settings-options { display: flex; flex-direction: column; gap: 1rem; }
    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .setting-label { font-size: 0.9375rem; color: var(--ml-text); }
    .setting-row-block { flex-wrap: wrap; align-items: center; gap: 0.75rem; }
    .primary-swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .primary-swatch {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid transparent;
      padding: 0;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .primary-swatch:hover {
      transform: scale(1.08);
      box-shadow: var(--ml-shadow-lg);
    }
    .primary-swatch--selected {
      border-color: var(--ml-text);
      box-shadow: 0 0 0 2px var(--ml-bg-card);
    }
    .primary-swatch .swatch-check {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #fff;
      filter: drop-shadow(0 0 1px rgba(0,0,0,0.5));
    }
    .primary-color-picker-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .primary-color-picker {
      width: 40px;
      height: 40px;
      padding: 0;
      border: 2px solid var(--ml-border);
      border-radius: var(--ml-radius);
      cursor: pointer;
      background: transparent;
    }
    .primary-color-picker::-webkit-color-swatch-wrapper { padding: 2px; }
    .primary-color-picker::-webkit-color-swatch { border-radius: 4px; border: none; }
    .language-tabs {
      display: flex;
      gap: 0.25rem;
    }
    .language-tabs button.active {
      background: color-mix(in srgb, var(--ml-primary) 15%, transparent);
      color: var(--ml-primary);
    }
    .currency-field { width: 100%; max-width: 200px; }
    .export-date-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }
    .export-field { width: 160px; }

    .item-list { list-style: none; margin: 0 0 1rem 0; padding: 0; }
    .item-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--ml-border);
      min-width: 0;
    }
    .item-row:last-child { border-bottom: none; }
    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .item-name {
      flex: 1;
      min-width: 0;
      font-size: 0.9375rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .edit-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: nowrap;
      padding: 0.5rem 0;
    }
    .edit-row .color-dot { flex-shrink: 0; }
    .edit-row .edit-input {
      flex: 1;
      min-width: 0;
      padding: 0.4rem 0.5rem;
      border: 1px solid var(--ml-border);
      border-radius: var(--ml-radius);
      font-size: 0.9375rem;
      height: 36px;
      box-sizing: border-box;
    }
    .edit-row .color-select-inline {
      flex-shrink: 0;
      min-width: 88px;
      height: 36px;
      padding: 0 0.5rem;
      border-radius: var(--ml-radius);
      border: 1px solid var(--ml-border);
      font-size: 0.8125rem;
    }
    .edit-row button.mat-mdc-icon-button {
      flex-shrink: 0;
    }
    .edit-row:has(.color-select-inline) .edit-input {
      max-width: 160px;
    }
    .color-select-inline {
      min-width: 90px;
      height: 36px;
      padding: 0 0.5rem;
      border-radius: var(--ml-radius);
      border: 1px solid var(--ml-border);
      font-size: 0.8125rem;
    }
    .color-picker-label { font-size: 0.875rem; color: var(--ml-text-muted); }
    .add-form {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .add-field { width: 200px; }
    .add-form-actions { display: flex; gap: 0.25rem; }
    .btn-add-item { text-transform: none; }
    .add-currency-form {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .currency-code-field { width: 180px; }
    .custom-currency-list {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0 0;
    }
    .custom-currency-list .item-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0;
    }
    .drag-handle {
      cursor: grab;
      color: var(--ml-text-muted);
      margin-right: 0.25rem;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
  `]
})
export class SettingsComponent {
  data = inject(DataService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private utils = inject(UtilsService);

  readonly categoryColors = CATEGORY_COLORS;
  readonly themePrimaryOptions = THEME_PRIMARY_OPTIONS;
  currentLang = computed(() => this.data.language());

  exporting = signal(false);
  exportFromDate: Date;
  exportToDate: Date;

  constructor() {
    const { from, to } = this.utils.getCurrentMonthRange();
    this.exportFromDate = this.utils.parseLocalDate(from) ?? new Date();
    this.exportToDate = this.utils.parseLocalDate(to) ?? new Date();
  }

  /** Hex #rrggbb for input[type=color] (expands #rgb to #rrggbb). */
  primaryColorForPicker(): string {
    const hex = (this.data.primaryColor() || '#0d9488').trim();
    if (hex.length === 4 && hex.startsWith('#')) {
      const r = hex[1] + hex[1];
      const g = hex[2] + hex[2];
      const b = hex[3] + hex[3];
      return `#${r}${g}${b}`;
    }
    return hex.startsWith('#') && hex.length === 7 ? hex : '#0d9488';
  }

  onPrimaryColorInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    if (value) this.data.setPrimaryColor(value);
  }

  setLanguage(lang: 'vi' | 'en'): void {
    this.data.setLanguage(lang);
  }

  showWalletForm = signal(false);
  showIncomeForm = signal(false);
  showExpenseForm = signal(false);
  editingWalletId = signal<string | null>(null);
  editingCategoryId = signal<string | null>(null);

  newWalletName = '';
  walletName = '';
  newCategoryName = '';
  newCategoryColor = CATEGORY_COLORS[0];
  editCategoryName = '';
  editCategoryColorValue = CATEGORY_COLORS[0];

  incomeCategories = computed(() => this.data.categories().filter(c => c.type === 'income'));
  expenseCategories = computed(() => this.data.categories().filter(c => c.type === 'expense'));

  newCurrencyCode = '';

  addCurrency(): void {
    const code = this.newCurrencyCode.trim().toUpperCase();
    if (!code || code.length < 2 || code.length > 5) return;
    if (this.data.supportedCurrencies().includes(code)) return;
    this.data.addCustomCurrency(code);
    this.newCurrencyCode = '';
    this.snackBar.open(this.translate.instant('messages.currencyAdded'), '', { duration: 2000 });
  }

  removeCurrency(code: string): void {
    if (this.data.supportedCurrencies().length <= 1) {
      this.snackBar.open(this.translate.instant('messages.currencyNeedAtLeastOne'), '', { duration: 3000 });
      return;
    }
    this.data.removeCustomCurrency(code);
    this.snackBar.open(this.translate.instant('messages.currencyRemoved'), '', { duration: 2000 });
  }

  onCurrencyDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.data.reorderCurrencies(event.previousIndex, event.currentIndex);
  }

  private userId(): string {
    const u = this.auth.user();
    if (!u) throw new Error('Chưa đăng nhập');
    return u.id;
  }

  async downloadTransactions(): Promise<void> {
    this.exporting.set(true);
    try {
      const from = this.utils.dateToLocalYYYYMMDD(this.exportFromDate);
      const to = this.utils.dateToLocalYYYYMMDD(this.exportToDate);
      const list = await this.data.getTransactions({
        userId: this.userId(),
        from,
        to
      });
      const categories = this.data.categories();
      const wallets = this.data.wallets();
      const uid = this.userId();
      const uncatLabel = this.translate.instant('categories.uncategorized');
      const escapeCsv = (v: string): string => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };
      const getCategoryName = (catId: string): string => {
        const cat = categories.find(c => c.id === catId);
        if (cat && this.data.isUncategorizedCategoryId(cat.id, uid)) return uncatLabel;
        return cat?.name ?? catId;
      };
      const getWalletName = (walletId: string): string =>
        wallets.find(w => w.id === walletId)?.name ?? walletId;
      const typeLabel = (t: Transaction): string =>
        t.type === 'income' ? this.translate.instant('nav.income') : this.translate.instant('nav.expense');
      const header = ['Date', 'Type', 'Category', 'Wallet', 'Amount', 'Currency', 'Note'];
      const rows = list.map(t => [
        t.date,
        typeLabel(t),
        getCategoryName(t.category_id),
        getWalletName(t.wallet_id),
        String(t.amount),
        t.currency,
        t.note ?? ''
      ]);
      const csvLines = [header.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))];
      const csvString = '\uFEFF' + csvLines.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.snackBar.open(this.translate.instant('messages.transactionsExported'), '', { duration: 2000 });
    } catch (e) {
      this.snackBar.open(this.errMsg(e), '', { duration: 4000 });
    } finally {
      this.exporting.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.data.resetInitialized();
    this.router.navigate(['/auth']);
  }

  startEditWallet(w: Wallet): void {
    this.editingWalletId.set(w.id);
    this.walletName = w.name;
  }

  cancelEditWallet(): void {
    this.editingWalletId.set(null);
  }

  async saveWallet(): Promise<void> {
    const id = this.editingWalletId();
    if (!id || !this.walletName.trim()) return;
    try {
      await this.data.updateWallet({ id, name: this.walletName.trim() });
      this.editingWalletId.set(null);
      this.snackBar.open(this.translate.instant('messages.walletUpdated'), '', { duration: 2000 });
    } catch (e) {
      this.snackBar.open(this.errMsg(e), '', { duration: 4000 });
    }
  }

  async addWallet(): Promise<void> {
    if (!this.newWalletName.trim()) return;
    try {
      const order = this.data.wallets().length;
      await this.data.addWallet(this.userId(), { name: this.newWalletName.trim(), order });
      this.newWalletName = '';
      this.showWalletForm.set(false);
      this.snackBar.open(this.translate.instant('messages.walletAdded'), '', { duration: 2000 });
    } catch (e) {
      this.snackBar.open(this.errMsg(e), '', { duration: 4000 });
    }
  }

  async deleteWallet(id: string): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: this.translate.instant('messages.confirmDeleteWallet'),
        confirmColor: 'warn',
        confirmText: this.translate.instant('common.delete')
      }
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.data.deleteWallet(this.userId(), id);
      this.snackBar.open(this.translate.instant('messages.walletDeleted'), '', { duration: 2000 });
    } catch (e) {
      this.snackBar.open(this.errMsg(e), '', { duration: 4000 });
    }
  }

  startEditCategory(c: Category): void {
    this.editingCategoryId.set(c.id);
    this.editCategoryName = c.name;
    this.editCategoryColorValue = c.color || CATEGORY_COLORS[0];
  }

  cancelEditCategory(): void {
    this.editingCategoryId.set(null);
  }

  async saveCategory(): Promise<void> {
    const id = this.editingCategoryId();
    if (!id || !this.editCategoryName.trim()) return;
    try {
      await this.data.updateCategory({ id, name: this.editCategoryName.trim(), color: this.editCategoryColorValue });
      this.editingCategoryId.set(null);
      this.snackBar.open(this.translate.instant('messages.categoryUpdated'), '', { duration: 2000 });
    } catch (e) {
      this.snackBar.open(this.errMsg(e), '', { duration: 4000 });
    }
  }

  async addCategory(type: CategoryType): Promise<void> {
    if (!this.newCategoryName.trim()) return;
    try {
      const order = type === 'income'
        ? this.incomeCategories().length
        : this.data.categories().filter(c => c.type === 'expense').length;
      await this.data.addCategory(this.userId(), {
        name: this.newCategoryName.trim(),
        type,
        color: this.newCategoryColor,
        order
      });
      this.newCategoryName = '';
      this.newCategoryColor = CATEGORY_COLORS[0];
      this.showIncomeForm.set(false);
      this.showExpenseForm.set(false);
      this.snackBar.open(this.translate.instant('messages.categoryAdded'), '', { duration: 2000 });
    } catch (e) {
      this.snackBar.open(this.errMsg(e), '', { duration: 4000 });
    }
  }

  isUncategorizedCategory(cat: Category): boolean {
    return this.data.isUncategorizedCategoryId(cat.id, this.userId());
  }

  async deleteCategory(cat: Category): Promise<void> {
    if (this.data.isUncategorizedCategoryId(cat.id, this.userId())) {
      this.snackBar.open(this.translate.instant('messages.cannotDeleteUncategorized'), '', { duration: 3000 });
      return;
    }
    const count = await this.data.getTransactionCountByCategoryId(this.userId(), cat.id);
    const displayName = cat.name;
    const confirmMsg = count > 0
      ? this.translate.instant('messages.confirmDeleteCategoryWithTransactions', { name: displayName, count })
      : this.translate.instant('messages.confirmDeleteCategory');
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: confirmMsg,
        confirmColor: 'warn',
        confirmText: this.translate.instant('common.delete')
      }
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      const { movedCount } = await this.data.deleteCategory(this.userId(), cat.id);
      if (movedCount > 0) {
        this.snackBar.open(this.translate.instant('messages.categoryDeletedMoved', { count: movedCount }), '', { duration: 3500 });
      } else {
        this.snackBar.open(this.translate.instant('messages.categoryDeleted'), '', { duration: 2000 });
      }
    } catch (e) {
      this.snackBar.open(this.errMsg(e), '', { duration: 4000 });
    }
  }

  async onWalletDrop(event: CdkDragDrop<Wallet[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    const list = [...this.data.wallets()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    for (let i = 0; i < list.length; i++) {
      await this.data.updateWallet({ id: list[i].id, order: i });
    }
  }

  async onIncomeCategoryDrop(event: CdkDragDrop<Category[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    const cats = [...this.incomeCategories()];
    moveItemInArray(cats, event.previousIndex, event.currentIndex);
    const baseOrder = cats.length ? Math.min(...this.incomeCategories().map(c => c.order)) : 0;
    for (let i = 0; i < cats.length; i++) {
      await this.data.updateCategory({ id: cats[i].id, order: baseOrder + i });
    }
  }

  async onExpenseCategoryDrop(event: CdkDragDrop<Category[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    const cats = [...this.expenseCategories()];
    moveItemInArray(cats, event.previousIndex, event.currentIndex);
    const baseOrder = cats.length ? Math.min(...this.expenseCategories().map(c => c.order)) : 0;
    for (let i = 0; i < cats.length; i++) {
      await this.data.updateCategory({ id: cats[i].id, order: baseOrder + i });
    }
  }

  private errMsg(e: unknown): string {
    return e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : this.translate.instant('common.error');
  }
}