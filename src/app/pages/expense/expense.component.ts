import { Component, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { UtilsService } from '../../core/utils.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormatMoneyPipe } from '../../shared/format-money.pipe';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import type { Transaction } from '../../models';
import type { Currency } from '../../models';

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    TranslateModule,
    FormatMoneyPipe
  ],
  template: `
    <h1 class="page-header">{{ 'pages.expense' | translate }}</h1>

    <mat-card class="ml-card form-card">
      <mat-card-content>
        @if (!showForm()) {
          <button mat-flat-button color="primary" class="btn-add" (click)="openForm()">
            + {{ 'expense.addExpense' | translate }}
          </button>
        } @else {
          <form class="transaction-form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.amount' | translate }}</mat-label>
              <input matInput type="number" [(ngModel)]="form.amount" name="amount" required min="1" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.currency' | translate }}</mat-label>
              <mat-select [(ngModel)]="form.currency" name="currency">
                @for (c of data.supportedCurrencies(); track c) {
                  <mat-option [value]="c">{{ c }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.category' | translate }}</mat-label>
              <mat-select [(ngModel)]="form.category_id" name="category_id" required>
                @for (c of expenseCategories(); track c.id) {
                  <mat-option [value]="c.id">{{ getCategoryDisplayName(c) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.wallet' | translate }}</mat-label>
              <mat-select [(ngModel)]="form.wallet_id" name="wallet_id" required>
                @for (w of data.wallets(); track w.id) {
                  <mat-option [value]="w.id">{{ w.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.date' | translate }}</mat-label>
              <input matInput [matDatepicker]="datePicker" [(ngModel)]="form.date" name="date" required readonly />
              <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
              <mat-datepicker #datePicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.note' | translate }}</mat-label>
              <input matInput [(ngModel)]="form.note" name="note" />
            </mat-form-field>
            <div class="form-actions">
              <button mat-flat-button color="primary" type="submit" [disabled]="saving()">{{ editingTxId() ? ('common.save' | translate) : ('common.add' | translate) }}</button>
              <button mat-button type="button" (click)="cancelForm()">{{ 'common.cancel' | translate }}</button>
            </div>
          </form>
        }
      </mat-card-content>
    </mat-card>

    <mat-card class="ml-card filters-card">
      <mat-card-content>
        <div class="filters">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>{{ 'common.fromDate' | translate }}</mat-label>
            <input matInput [matDatepicker]="fromPicker" [(ngModel)]="fromDate" (dateChange)="loadTransactions()" readonly />
            <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
            <mat-datepicker #fromPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>{{ 'common.toDate' | translate }}</mat-label>
            <input matInput [matDatepicker]="toPicker" [(ngModel)]="toDate" (dateChange)="loadTransactions()" readonly />
            <mat-datepicker-toggle matSuffix [for]="toPicker"></mat-datepicker-toggle>
            <mat-datepicker #toPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>{{ 'common.wallet' | translate }}</mat-label>
            <mat-select [(ngModel)]="filterWalletId" (selectionChange)="loadTransactions()">
              <mat-option [value]="null">{{ 'common.allWallets' | translate }}</mat-option>
              @for (w of data.wallets(); track w.id) {
                <mat-option [value]="w.id">{{ w.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card class="ml-card list-card">
      <mat-card-header>
        <mat-card-title>{{ 'expense.listTitle' | translate }}</mat-card-title>
        <mat-card-subtitle class="list-hint">{{ 'expense.doubleClickToEdit' | translate }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        @if (transactions().length === 0) {
          <p class="empty">{{ 'expense.empty' | translate }}</p>
        } @else {
          <ul class="tx-list">
            @for (t of displayedTransactions(); track t.id) {
              <li class="tx-row" (click)="onRowClick($event, t)" (dblclick)="startEditTx(t); $event.preventDefault()">
                <div class="tx-main">
                  <div class="tx-top">
                    <span class="tx-category-label" [style.--category-bg]="getCategoryColor(t.category_id)" [style.--category-fg]="getCategoryColorFg(t.category_id)">{{ getCategoryName(t.category_id) }}</span>
                    <span class="tx-date">{{ formatShortDate(t.date) }}</span>
                  </div>
                  <span class="tx-wallet-text">{{ getWalletName(t.wallet_id) }}</span>
                  @if (t.note?.trim()) {
                    <p class="tx-note">{{ t.note }}</p>
                  }
                </div>
                <div class="tx-right">
                  <span class="tx-amount negative">− {{ t.amount | formatMoney:t.currency }}</span>
                  <button mat-icon-button (click)="deleteTx(t.id); $event.stopPropagation()" (dblclick)="$event.stopPropagation()" [attr.aria-label]="'common.delete' | translate"><mat-icon>delete</mat-icon></button>
                </div>
              </li>
            }
          </ul>
          @if (transactions().length > displayLimit()) {
            <button mat-button class="load-more" (click)="loadMore()">{{ 'expense.loadMore' | translate }} ({{ displayLimit() }}/{{ transactions().length }})</button>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .form-card { margin-bottom: 1rem; }
    .filters-card { margin-bottom: 1rem; }
    .filters { display: flex; flex-wrap: wrap; gap: 1rem; }
    .filter-field { width: 140px; }
    .full-width { width: 100%; }
    .btn-add { text-transform: none; font-weight: 600; border-radius: var(--ml-radius); margin-bottom: 1rem; }
    .transaction-form { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .list-card { margin-top: 1rem; }
    .list-card .mat-mdc-card-title { font-size: 0.9375rem; font-weight: 600; color: var(--ml-text-muted); margin-bottom: 0.25rem; }
    .list-hint { margin: 0 0 0.5rem; font-size: 0.75rem; color: var(--ml-text-muted); }
    .empty { margin: 0; color: var(--ml-text-muted); font-size: 0.9375rem; }
    .tx-list { list-style: none; margin: 0; padding: 0; }
    .tx-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--ml-border);
      min-width: 0;
      cursor: pointer;
      user-select: none;
    }
    .tx-row:last-child { border-bottom: none; }
    .tx-main {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
      flex: 1 1 auto;
    }
    .tx-top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem 0.5rem;
    }
    .tx-category-label {
      display: inline-block;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.22rem 0.5rem;
      border-radius: 999px;
      background: var(--ml-bg-hover, rgba(0,0,0,.06));
      background: color-mix(in srgb, var(--category-bg) 22%, transparent);
      color: var(--category-fg);
      width: fit-content;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tx-date {
      font-size: 0.8rem;
      color: var(--ml-text-muted);
      flex-shrink: 0;
    }
    .tx-wallet-text {
      font-size: 0.8rem;
      color: var(--ml-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tx-note {
      margin: 0;
      font-size: 0.8rem;
      color: var(--ml-text-muted);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-left: 0;
    }
    .tx-right { display: flex; align-items: center; gap: 0.15rem; flex-shrink: 0; }
    .tx-amount.negative { color: var(--ml-error); font-weight: 600; font-size: 0.95rem; white-space: nowrap; }
    .load-more { margin-top: 0.5rem; width: 100%; text-transform: none; }
  `]
})
export class ExpenseComponent {
  data = inject(DataService);
  private auth = inject(AuthService);
  private utils = inject(UtilsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);

  showForm = signal(true);
  editingTxId = signal<string | null>(null);
  saving = signal(false);
  transactions = signal<Transaction[]>([]);
  /** Số dòng hiển thị; reset khi đổi filter, tăng khi bấm "Xem thêm". */
  displayLimit = signal(10);
  displayedTransactions = computed(() => this.transactions().slice(0, this.displayLimit()));
  fromDate: Date;
  toDate: Date;
  filterWalletId: string | null = null;
  private readonly PAGE_SIZE = 10;

  form = {
    amount: 0,
    currency: 'VND' as Currency,
    category_id: '',
    wallet_id: '',
    date: new Date(),
    note: ''
  };

  expenseCategories = computed(() => this.data.categories().filter(c => c.type === 'expense'));

  constructor() {
    const { from, to } = this.utils.getCurrentMonthRange();
    this.fromDate = this.utils.parseLocalDate(from) ?? new Date();
    this.toDate = this.utils.parseLocalDate(to) ?? new Date();
    effect(() => {
      if (this.data.initialized()) {
        this.loadTransactions();
        this.openForm();
      }
    });
  }

  private userId(): string {
    const u = this.auth.user();
    if (!u) throw new Error('Chưa đăng nhập');
    return u.id;
  }

  async loadTransactions(): Promise<void> {
    const from = this.utils.dateToLocalYYYYMMDD(this.fromDate);
    const to = this.utils.dateToLocalYYYYMMDD(this.toDate);
    const list = await this.data.getTransactions({
      userId: this.userId(),
      type: 'expense',
      from,
      to,
      walletId: this.filterWalletId ?? undefined
    });
    this.transactions.set(list);
    this.displayLimit.set(this.PAGE_SIZE);
  }

  loadMore(): void {
    this.displayLimit.update(n => n + this.PAGE_SIZE);
  }

  openForm(): void {
    this.editingTxId.set(null);
    const cats = this.expenseCategories();
    const wallets = this.data.wallets();
    this.form = {
      amount: 0,
      currency: this.data.currency(),
      category_id: cats[0]?.id ?? '',
      wallet_id: wallets[0]?.id ?? '',
      date: new Date(),
      note: ''
    };
    this.showForm.set(true);
  }

  startEditTx(t: Transaction): void {
    this.editingTxId.set(t.id);
    const dateObj = this.utils.parseLocalDate(t.date) ?? new Date();
    this.form = {
      amount: t.amount,
      currency: t.currency as Currency,
      category_id: t.category_id,
      wallet_id: t.wallet_id,
      date: dateObj,
      note: t.note ?? ''
    };
    this.showForm.set(true);
    this.scrollFormIntoView();
  }

  private scrollFormIntoView(): void {
    queueMicrotask(() => {
      const el = document.querySelector('.transaction-form');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /** Hai lần click nhanh trên cùng dòng = mở sửa (đáng tin cậy hơn sự kiện dblclick trên một số trình duyệt). */
  private _lastClick: { id: string; time: number } | null = null;
  private readonly _doubleClickDelayMs = 400;

  onRowClick(e: Event, t: Transaction): void {
    if ((e.target as HTMLElement).closest('button')) return;
    const now = Date.now();
    if (this._lastClick?.id === t.id && now - this._lastClick.time < this._doubleClickDelayMs) {
      this._lastClick = null;
      this.startEditTx(t);
      return;
    }
    this._lastClick = { id: t.id, time: now };
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingTxId.set(null);
    const cats = this.expenseCategories();
    const wallets = this.data.wallets();
    this.form = {
      amount: 0,
      currency: this.data.currency(),
      category_id: cats[0]?.id ?? '',
      wallet_id: wallets[0]?.id ?? '',
      date: new Date(),
      note: ''
    };
  }

  async submit(): Promise<void> {
    if (this.form.amount <= 0 || !this.form.category_id || !this.form.wallet_id) return;
    this.saving.set(true);
    const id = this.editingTxId();
    try {
      const dateStr = this.utils.dateToLocalYYYYMMDD(this.form.date instanceof Date ? this.form.date : new Date(this.form.date));
      if (id) {
        await this.data.updateTransaction({
          id,
          amount: this.form.amount,
          category_id: this.form.category_id,
          wallet_id: this.form.wallet_id,
          date: dateStr,
          currency: this.form.currency,
          note: this.form.note?.trim() || undefined
        });
        this.snackBar.open(this.translate.instant('messages.transactionUpdated'), '', { duration: 2000 });
      } else {
        await this.data.addTransaction({
          amount: this.form.amount,
          type: 'expense',
          category_id: this.form.category_id,
          wallet_id: this.form.wallet_id,
          date: dateStr,
          currency: this.form.currency,
          note: this.form.note?.trim() || undefined
        }, this.userId());
        this.snackBar.open(this.translate.instant('messages.expenseAdded'), '', { duration: 2000 });
      }
      this.cancelForm();
      await this.loadTransactions();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : this.translate.instant('common.error');
      this.snackBar.open(msg, '', { duration: 4000 });
    } finally {
      this.saving.set(false);
    }
  }

  async deleteTx(id: string): Promise<void> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: this.translate.instant('messages.confirmDeleteTransaction'),
        confirmColor: 'warn',
        confirmText: this.translate.instant('common.delete')
      }
    });
    const confirmed = await firstValueFrom(ref.afterClosed());
    if (!confirmed) return;
    try {
      await this.data.deleteTransaction(id);
      this.snackBar.open(this.translate.instant('messages.transactionDeleted'), '', { duration: 2000 });
      await this.loadTransactions();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : this.translate.instant('common.error');
      this.snackBar.open(msg, '', { duration: 4000 });
    }
  }

  getCategoryDisplayName(cat: { id: string; name: string }): string {
    const uid = this.auth.user()?.id ?? '';
    if (uid && this.data.isUncategorizedCategoryId(cat.id, uid)) return this.translate.instant('categories.uncategorized');
    return cat.name;
  }

  getCategoryName(id: string): string {
    const cat = this.data.categories().find(c => c.id === id);
    return cat ? this.getCategoryDisplayName(cat) : id;
  }

  getWalletName(id: string): string {
    return this.data.wallets().find(w => w.id === id)?.name ?? id;
  }

  formatShortDate(dateStr: string): string {
    return this.utils.formatShortDate(dateStr);
  }

  /** Màu cho category (từ category.color hoặc palette theo thứ tự). */
  private readonly CATEGORY_PALETTE = [
    '#b91c1c', '#b45309', '#047857', '#0d9488', '#2563eb', '#7c3aed', '#c026d3', '#0e7490'
  ];

  getCategoryColor(categoryId: string): string {
    const cats = this.expenseCategories();
    const cat = cats.find(c => c.id === categoryId);
    if (cat?.color) return cat.color;
    const i = cats.findIndex(c => c.id === categoryId);
    return this.CATEGORY_PALETTE[i >= 0 ? i % this.CATEGORY_PALETTE.length : 0];
  }

  getCategoryColorFg(categoryId: string): string {
    return this.getCategoryColor(categoryId);
  }
}
