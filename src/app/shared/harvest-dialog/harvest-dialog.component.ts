import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { FormatMoneyPipe } from '../format-money.pipe';
import { DataService } from '../../core/data.service';

@Component({
  selector: 'app-harvest-dialog',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, TranslateModule, FormatMoneyPipe],
  template: `
    <div class="harvest-overlay" (click)="closed.emit('leave')">
      <div class="harvest-card" (click)="$event.stopPropagation()">
        <div class="harvest-header">
          <mat-icon class="harvest-icon">celebration</mat-icon>
          <h2 class="harvest-title">{{ 'harvest.title' | translate }}</h2>
        </div>
        <p class="harvest-congrats">
          {{ 'harvest.congrats' | translate }}
          <span class="harvest-amounts">
            @for (entry of amountEntries(); track entry.currency) {
              <span class="amount-line">{{ entry.amount | formatMoney:entry.currency }}</span>
            }
          </span>
          {{ 'harvest.congratsSuffix' | translate }}
        </p>
        <p class="harvest-question">{{ 'harvest.question' | translate }}</p>
        <div class="harvest-actions">
          <button mat-flat-button color="primary" class="harvest-btn" (click)="closed.emit('savings')">
            <mat-icon>savings</mat-icon>
            {{ 'harvest.btnSavings' | translate }}
          </button>
          <button mat-flat-button class="harvest-btn harvest-btn-guilty" (click)="closed.emit('guilty')">
            <mat-icon>card_giftcard</mat-icon>
            {{ 'harvest.btnGuilty' | translate }}
          </button>
          <button mat-stroked-button class="harvest-btn" (click)="closed.emit('leave')">
            <mat-icon>account_balance_wallet</mat-icon>
            {{ 'harvest.btnLeave' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .harvest-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: harvestFadeIn 0.25s ease-out;
    }
    @keyframes harvestFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .harvest-card {
      background: var(--ml-bg-card);
      border-radius: var(--ml-radius);
      box-shadow: var(--ml-shadow-lg);
      max-width: 420px;
      width: 100%;
      padding: 1.5rem;
      animation: harvestSlideIn 0.3s ease-out;
    }
    @keyframes harvestSlideIn {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .harvest-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .harvest-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: var(--ml-primary);
    }
    .harvest-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--ml-text);
    }
    .harvest-congrats {
      margin: 0 0 0.5rem;
      color: var(--ml-text);
      line-height: 1.5;
    }
    .harvest-amounts {
      display: block;
      margin: 0.25rem 0;
      font-weight: 700;
      color: var(--ml-primary);
    }
    .amount-line {
      display: block;
    }
    .harvest-question {
      margin: 0 0 1.25rem;
      font-weight: 600;
      color: var(--ml-text-muted);
      font-size: 0.9375rem;
    }
    .harvest-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .harvest-btn {
      justify-content: flex-start;
      text-align: left;
    }
    .harvest-btn mat-icon {
      margin-right: 0.5rem;
    }
    .harvest-btn-guilty {
      background: rgba(233, 30, 99, 0.12);
      color: #e91e63;
    }
    .harvest-btn-guilty:hover {
      background: rgba(233, 30, 99, 0.2);
    }
  `]
})
export class HarvestDialogComponent {
  /** Số dư thu hoạch theo từng currency (4C). */
  amounts = input.required<Record<string, number>>();

  /** Thứ tự currency theo settings. */
  private data = inject(DataService);

  /** Emit khi user chọn: savings | guilty | leave. */
  readonly closed = output<'savings' | 'guilty' | 'leave'>();

  /** Mảng [currency, amount] để hiển thị theo thứ tự currency_list. */
  amountEntries(): { currency: string; amount: number }[] {
    const a = this.amounts();
    const order = this.data.supportedCurrencies();
    return order.filter((c: string) => (a[c] ?? 0) > 0).map((currency: string) => ({ currency, amount: a[currency]! }));
  }
}
