import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { SupabaseService } from './db/supabase.service';
import { UtilsService } from './utils.service';
import { getUncategorizedCategoryIds } from './db/seed-data';
import type { Transaction } from '../models';

const HARVEST_STORAGE_PREFIX = 'moneyluvr_harvest_shown_';

/** Tên ví đặc biệt (1A): Quỹ tiết kiệm, Quỹ tội lỗi. */
export const WALLET_NAME_SAVINGS = 'Quỹ tiết kiệm';
export const WALLET_NAME_GUILTY = 'Quỹ tội lỗi';

@Injectable({ providedIn: 'root' })
export class HarvestService {
  constructor(
    private data: DataService,
    private supabase: SupabaseService,
    private utils: UtilsService
  ) {}

  /** Hôm nay có phải ngày 1 (local) không. */
  isTodayFirstDay(): boolean {
    return new Date().getDate() === 1;
  }

  /** Tháng trước dạng YYYY-MM. */
  getPrevMonthKey(): string {
    const today = new Date();
    return this.utils.getPrevMonth(this.utils.getMonthKey(today));
  }

  private storageKey(userId: string, monthKey: string): string {
    return `${HARVEST_STORAGE_PREFIX}${userId}_${monthKey}`;
  }

  /** Đã lưu "đã show" cho tháng trong localStorage chưa. */
  hasShownInStorage(userId: string, monthKey: string): boolean {
    return localStorage.getItem(this.storageKey(userId, monthKey)) === '1';
  }

  /** Lưu "đã show" vào localStorage (3C). */
  setShownInStorage(userId: string, monthKey: string): void {
    localStorage.setItem(this.storageKey(userId, monthKey), '1');
  }

  /**
   * Kiểm tra có nên show popup không.
   * Trả về số dư thu hoạch theo từng currency (4C) nếu cần show, null nếu không.
   */
  async checkShouldShow(userId: string): Promise<Record<string, number> | null> {
    if (!this.isTodayFirstDay()) return null;
    const prevKey = this.getPrevMonthKey();
    if (this.hasShownInStorage(userId, prevKey)) return null;
    const shownMonths: string[] = await this.supabase.getHarvestShownMonthKeys(userId).catch(() => []);
    if (shownMonths.includes(prevKey)) return null;
    const amounts = await this.getHarvestAmountsPerCurrency(userId);
    const hasPositive = Object.values(amounts).some(v => v > 0);
    if (!hasPositive) return null;
    return amounts;
  }

  /**
   * Số dư cuối tháng trước theo từng currency (4C).
   * Dùng giao dịch từ đầu đến hết tháng trước, tổng (thu - chi) theo currency.
   */
  async getHarvestAmountsPerCurrency(userId: string): Promise<Record<string, number>> {
    const prevKey = this.getPrevMonthKey();
    const { to } = this.utils.getMonthRange(prevKey);
    const list = await this.data.getTransactions({ userId, from: '2000-01-01', to });
    const byCurrency: Record<string, number> = {};
    for (const t of list) {
      const cur = t.currency;
      byCurrency[cur] = (byCurrency[cur] ?? 0) + (t.type === 'income' ? t.amount : -t.amount);
    }
    return byCurrency;
  }

  /** Đánh dấu đã show cho tháng (3C: DB + localStorage). */
  async markShown(userId: string, monthKey: string): Promise<void> {
    this.setShownInStorage(userId, monthKey);
    await this.supabase.markHarvestShown(userId, monthKey);
  }

  /** Tạo hai ví đặc biệt nếu chưa có (1A). */
  async ensureSpecialWallets(userId: string): Promise<{ savingsId: string; guiltyId: string }> {
    const wallets = this.data.wallets();
    let savings = wallets.find(w => w.name === WALLET_NAME_SAVINGS);
    let guilty = wallets.find(w => w.name === WALLET_NAME_GUILTY);
    const maxOrder = wallets.length > 0 ? Math.max(...wallets.map(w => w.order)) : -1;
    if (!savings) {
      await this.data.addWallet(userId, { name: WALLET_NAME_SAVINGS, order: maxOrder + 1 });
      savings = this.data.wallets().find(w => w.name === WALLET_NAME_SAVINGS)!;
    }
    if (!guilty) {
      await this.data.addWallet(userId, { name: WALLET_NAME_GUILTY, order: maxOrder + 2 });
      guilty = this.data.wallets().find(w => w.name === WALLET_NAME_GUILTY)!;
    }
    return { savingsId: savings.id, guiltyId: guilty.id };
  }

  /**
   * Chuyển toàn bộ số thu hoạch (theo từng currency) vào ví đích (savings hoặc guilty).
   * Tạo expense từ ví nguồn (có dư) và income vào ví đích (1A).
   */
  async transferHarvestToWallet(
    userId: string,
    target: 'savings' | 'guilty',
    amountsPerCurrency: Record<string, number>
  ): Promise<void> {
    const prevKey = this.getPrevMonthKey();
    const { to: toDate } = this.utils.getMonthRange(prevKey);
    const allTx = await this.data.getTransactions({ userId, from: '2000-01-01', to: toDate });
    const walletBalanceByCurrency = new Map<string, Record<string, number>>();
    for (const t of allTx) {
      if (!walletBalanceByCurrency.has(t.wallet_id)) walletBalanceByCurrency.set(t.wallet_id, {});
      const rec = walletBalanceByCurrency.get(t.wallet_id)!;
      rec[t.currency] = (rec[t.currency] ?? 0) + (t.type === 'income' ? t.amount : -t.amount);
    }
    const { expenseId, incomeId } = getUncategorizedCategoryIds(userId);
    const { savingsId, guiltyId } = await this.ensureSpecialWallets(userId);
    const targetWalletId = target === 'savings' ? savingsId : guiltyId;
    const targetName = target === 'savings' ? WALLET_NAME_SAVINGS : WALLET_NAME_GUILTY;
    const dateStr = toDate;

    for (const [currency, totalAmount] of Object.entries(amountsPerCurrency)) {
      if (totalAmount <= 0) continue;
      const entries = Array.from(walletBalanceByCurrency.entries())
        .map(([wid, rec]) => ({ walletId: wid, balance: rec[currency] ?? 0 }))
        .filter(x => x.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      let remaining = totalAmount;
      for (const { walletId, balance } of entries) {
        if (remaining <= 0) break;
        const amount = Math.min(remaining, balance);
        await this.data.addTransaction({
          amount,
          type: 'expense',
          category_id: expenseId,
          wallet_id: walletId,
          date: dateStr,
          currency,
          note: `Chuyển vào ${targetName} (Thu hoạch ${prevKey})`
        }, userId);
        remaining -= amount;
      }
      await this.data.addTransaction({
        amount: totalAmount,
        type: 'income',
        category_id: incomeId,
        wallet_id: targetWalletId,
        date: dateStr,
        currency,
        note: `Thu hoạch tháng ${prevKey} chuyển vào ${targetName}`
      }, userId);
    }
  }
}
