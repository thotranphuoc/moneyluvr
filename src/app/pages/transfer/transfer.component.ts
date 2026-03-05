import { Component, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { UtilsService } from '../../core/utils.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormatMoneyPipe } from '../../shared/format-money.pipe';
import { getUncategorizedCategoryIds } from '../../core/db/seed-data';
import type { Currency, Transaction } from '../../models';

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TranslateModule,
    FormatMoneyPipe
  ],
  template: `
    <h1 class="page-header">{{ 'pages.transfer' | translate }}</h1>

    <mat-card class="ml-card">
      <mat-card-content>
        @if (data.wallets().length < 2) {
          <p class="transfer-hint">{{ 'transfer.needTwoWallets' | translate }}</p>
        } @else {
          <form class="transfer-form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'transfer.fromWallet' | translate }}</mat-label>
              <mat-select [(ngModel)]="form.fromWalletId" name="fromWalletId" required>
                @for (w of data.wallets(); track w.id) {
                  <mat-option [value]="w.id">{{ w.name }} ({{ getWalletBalance(w.id) | formatMoney:form.currency }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'transfer.toWallet' | translate }}</mat-label>
              <mat-select [(ngModel)]="form.toWalletId" name="toWalletId" required>
                @for (w of data.wallets(); track w.id) {
                  <mat-option [value]="w.id">{{ w.name }} ({{ getWalletBalance(w.id) | formatMoney:form.currency }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'transfer.amount' | translate }}</mat-label>
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
              <button mat-flat-button color="primary" type="submit" [disabled]="saving()">{{ 'transfer.submit' | translate }}</button>
            </div>
          </form>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .ml-card { margin-bottom: 1rem; }
    .full-width { width: 100%; }
    .transfer-form { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-actions { margin-top: 0.5rem; }
    .transfer-hint { margin: 0; color: var(--ml-text-muted); font-size: 0.9375rem; }
  `]
})
export class TransferComponent {
  data = inject(DataService);
  private auth = inject(AuthService);
  private utils = inject(UtilsService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  saving = signal(false);
  /** Toàn bộ giao dịch đến hôm nay (để tính số dư theo ví, theo currency). */
  allTransactions = signal<Transaction[]>([]);

  /** Số dư theo walletId và currency: walletId -> currency -> number. */
  walletBalanceByCurrency = computed(() => {
    const tx = this.allTransactions();
    const map = new Map<string, Record<string, number>>();
    for (const t of tx) {
      if (!map.has(t.wallet_id)) map.set(t.wallet_id, {});
      const rec = map.get(t.wallet_id)!;
      const cur = t.currency;
      rec[cur] = (rec[cur] ?? 0) + (t.type === 'income' ? t.amount : -t.amount);
    }
    return map;
  });

  form = {
    fromWalletId: '' as string,
    toWalletId: '' as string,
    amount: 0,
    currency: 'VND' as Currency,
    date: new Date(),
    note: ''
  };

  constructor() {
    effect(() => {
      if (!this.data.initialized()) return;
      const user = this.auth.user();
      if (!user) return;
      const to = this.utils.getTodayLocalYYYYMMDD();
      this.data.getTransactions({ userId: user.id, from: '2000-01-01', to }).then(list => {
        this.allTransactions.set(list);
      });
    });
    effect(() => {
      if (!this.data.initialized()) return;
      const wallets = this.data.wallets();
      if (wallets.length >= 2 && !this.form.fromWalletId && !this.form.toWalletId) {
        this.form.fromWalletId = wallets[0].id;
        this.form.toWalletId = wallets[1].id;
        this.form.currency = (this.data.currency() ?? 'VND') as Currency;
      }
    });
  }

  /** Số dư hiện tại của ví theo currency đang chọn trong form. */
  getWalletBalance(walletId: string): number {
    return this.walletBalanceByCurrency().get(walletId)?.[this.form.currency] ?? 0;
  }

  private userId(): string {
    const u = this.auth.user();
    if (!u) throw new Error('Chưa đăng nhập');
    return u.id;
  }

  private getWalletName(walletId: string): string {
    return this.data.wallets().find(w => w.id === walletId)?.name ?? walletId;
  }

  async submit(): Promise<void> {
    if (this.form.fromWalletId === this.form.toWalletId) {
      this.snackBar.open(this.translate.instant('transfer.sameWalletError'), '', { duration: 3000 });
      return;
    }
    if (this.form.amount <= 0 || !this.form.fromWalletId || !this.form.toWalletId) return;

    const userId = this.userId();
    const dateStr = this.utils.dateToLocalYYYYMMDD(this.form.date instanceof Date ? this.form.date : new Date(this.form.date));
    const { expenseId, incomeId } = getUncategorizedCategoryIds(userId);
    const fromName = this.getWalletName(this.form.fromWalletId);
    const toName = this.getWalletName(this.form.toWalletId);
    const noteTo = this.translate.instant('transfer.noteTo', { wallet: toName });
    const noteFrom = this.translate.instant('transfer.noteFrom', { wallet: fromName });
    const userNote = this.form.note?.trim();

    this.saving.set(true);
    try {
      await this.data.addTransaction({
        amount: this.form.amount,
        type: 'expense',
        category_id: expenseId,
        wallet_id: this.form.fromWalletId,
        date: dateStr,
        currency: this.form.currency,
        note: userNote ? `${noteTo}. ${userNote}` : noteTo
      }, userId);

      await this.data.addTransaction({
        amount: this.form.amount,
        type: 'income',
        category_id: incomeId,
        wallet_id: this.form.toWalletId,
        date: dateStr,
        currency: this.form.currency,
        note: userNote ? `${noteFrom}. ${userNote}` : noteFrom
      }, userId);

      this.snackBar.open(this.translate.instant('transfer.success'), '', { duration: 2000 });
      this.form.amount = 0;
      this.form.note = '';
      this.form.date = new Date();
      const to = this.utils.getTodayLocalYYYYMMDD();
      const list = await this.data.getTransactions({ userId, from: '2000-01-01', to });
      this.allTransactions.set(list);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : this.translate.instant('common.error');
      this.snackBar.open(msg, '', { duration: 4000 });
    } finally {
      this.saving.set(false);
    }
  }
}
