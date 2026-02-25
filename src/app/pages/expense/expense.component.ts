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
              <input matInput [matDatepicker]="datePicker" [(ngModel)]="form.date" name="date" required />
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
            <input matInput [matDatepicker]="fromPicker" [(ngModel)]="fromDate" (dateChange)="loadTransactions()" />
            <mat-datepicker #fromPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>{{ 'common.toDate' | translate }}</mat-label>
            <input matInput [matDatepicker]="toPicker" [(ngModel)]="toDate" (dateChange)="loadTransactions()" />
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
      </mat-card-header>
      <mat-card-content>
        @if (transactions().length === 0) {
          <p class="empty">{{ 'expense.empty' | translate }}</p>
        } @else {
          <ul class="tx-list">
            @for (t of transactions(); track t.id) {
              <li class="tx-row" (dblclick)="startEditTx(t)" (touchstart)="onRowTouchStart($event, t)" (touchend)="onRowTouchEnd($event, t)" (touchmove)="onRowTouchCancel()">
                <div class="tx-main">
                  <span class="tx-category">{{ getCategoryName(t.category_id) }}</span>
                  <span class="tx-meta">{{ t.date }} · {{ getWalletName(t.wallet_id) }}{{ t.note ? ' · ' + t.note : '' }}</span>
                </div>
                <div class="tx-right">
                  <span class="tx-amount negative">− {{ t.amount | formatMoney:t.currency }}</span>
                  <button mat-icon-button (click)="deleteTx(t.id)" (dblclick)="$event.stopPropagation()" [attr.aria-label]="'common.delete' | translate"><mat-icon>delete</mat-icon></button>
                </div>
              </li>
            }
          </ul>
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
    .list-card .mat-mdc-card-title { font-size: 0.9375rem; font-weight: 600; color: var(--ml-text-muted); margin-bottom: 0.75rem; }
    .empty { margin: 0; color: var(--ml-text-muted); font-size: 0.9375rem; }
    .tx-list { list-style: none; margin: 0; padding: 0; }
    .tx-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--ml-border);
      min-width: 0;
    }
    .tx-row:last-child { border-bottom: none; }
    .tx-main {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
      flex: 1 1 auto;
    }
    .tx-category {
      font-weight: 500;
      font-size: 0.9375rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tx-meta {
      font-size: 0.8125rem;
      color: var(--ml-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tx-right { display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0; }
    .tx-amount.negative { color: var(--ml-error); font-weight: 600; white-space: nowrap; }
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
  fromDate: Date;
  toDate: Date;
  filterWalletId: string | null = null;

  form = {
    amount: 0,
    currency: 'VND' as Currency,
    category_id: '',
    wallet_id: '',
    date: new Date(),
    note: ''
  };

  expenseCategories = computed(() => this.data.categories().filter(c => c.type === 'expense'));

  private _touchStartTime = 0;
  private _touchStartTx: Transaction | null = null;

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
  }

  onRowTouchStart(_e: TouchEvent, t: Transaction): void {
    this._touchStartTime = Date.now();
    this._touchStartTx = t;
  }

  onRowTouchEnd(e: TouchEvent, t: Transaction): void {
    if (this._touchStartTx === t && Date.now() - this._touchStartTime >= 500) {
      this.startEditTx(t);
      e.preventDefault();
    }
    this._touchStartTx = null;
  }

  onRowTouchCancel(): void {
    this._touchStartTx = null;
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
}
