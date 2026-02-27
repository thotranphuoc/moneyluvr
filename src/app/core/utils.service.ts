import { Injectable } from '@angular/core';
import type { Currency } from '../models';

@Injectable({ providedIn: 'root' })
export class UtilsService {
  getTodayLocalYYYYMMDD(): string {
    return this.dateToLocalYYYYMMDD(new Date());
  }

  dateToLocalYYYYMMDD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  parseLocalDate(s: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!match) return null;
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1;
    const d = parseInt(match[3], 10);
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }

  /** Ngày ngắn không năm, ví dụ 27/02 */
  formatShortDate(dateStr: string): string {
    const d = this.parseLocalDate(dateStr);
    if (!d) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  getMonthKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  getMonthRange(monthKey: string): { from: string; to: string } {
    const [y, m] = monthKey.split('-').map(Number);
    const from = `${monthKey}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  }

  getCurrentMonthRange(): { from: string; to: string } {
    return this.getMonthRange(this.getMonthKey(new Date()));
  }

  getPrevMonth(monthKey: string): string {
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() - 1);
    return this.getMonthKey(d);
  }

  formatMoney(amount: number, currency: Currency): string {
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount) + ' ₫';
    }
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    } catch {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency;
    }
  }
}
