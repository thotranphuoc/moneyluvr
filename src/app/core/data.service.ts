import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './db/supabase.service';
import { getDefaultCategories, getDefaultWallets, getUncategorizedCategoryIds, getUncategorizedCategories } from './db/seed-data';
import type { Category, Wallet, Budget, Transaction } from '../models';
import type { Currency } from '../models';
import { UtilsService } from './utils.service';
import { TranslateService } from '@ngx-translate/core';

const STORAGE_DARK = 'moneyluvr_dark';
const STORAGE_CURRENCY = 'moneyluvr_currency';
const STORAGE_CURRENCY_LIST = 'moneyluvr_currency_list';
const STORAGE_PRIMARY = 'moneyluvr_primary';
export const LANG_STORAGE = 'moneyluvr_lang';
const DEFAULT_PRIMARY = '#0d9488';

const DEFAULT_CURRENCY_LIST: string[] = ['VND', 'USD', 'SGD'];

@Injectable({ providedIn: 'root' })
export class DataService {
  private categoriesSig = signal<Category[]>([]);
  private walletsSig = signal<Wallet[]>([]);
  private budgetsSig = signal<Budget[]>([]);
  private initializedSig = signal(false);
  private darkModeSig = signal( localStorage.getItem(STORAGE_DARK) === 'true' );
  private currencyListSig = signal<string[]>(this.loadCurrencyList());
  private currencySig = signal<Currency>(this.getInitialDefaultCurrency());
  private primaryColorSig = signal(localStorage.getItem(STORAGE_PRIMARY) || DEFAULT_PRIMARY);
  private languageSig = signal<string>(localStorage.getItem(LANG_STORAGE) === 'vi' ? 'vi' : 'en');
  private currentUserId: string | null = null;

  readonly categories = this.categoriesSig.asReadonly();
  readonly wallets = this.walletsSig.asReadonly();
  readonly budgets = this.budgetsSig.asReadonly();
  readonly initialized = this.initializedSig.asReadonly();
  readonly darkMode = this.darkModeSig.asReadonly();
  readonly currency = this.currencySig.asReadonly();
  readonly primaryColor = this.primaryColorSig.asReadonly();
  readonly language = this.languageSig.asReadonly();

  /** Danh sách đơn vị tiền tệ (thứ tự do user thêm/xóa/sắp xếp). */
  supportedCurrencies = this.currencyListSig.asReadonly();

  private loadCurrencyList(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENCY_LIST);
      if (raw) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) && arr.length > 0 ? arr : [...DEFAULT_CURRENCY_LIST];
      }
      return [...DEFAULT_CURRENCY_LIST];
    } catch {
      return [...DEFAULT_CURRENCY_LIST];
    }
  }

  private getInitialDefaultCurrency(): Currency {
    const list = this.loadCurrencyList();
    const saved = localStorage.getItem(STORAGE_CURRENCY);
    if (saved && list.includes(saved)) return saved;
    return (list[0] as Currency) || 'VND';
  }

  private persistCurrencyList(list: string[]): void {
    localStorage.setItem(STORAGE_CURRENCY_LIST, JSON.stringify(list));
    this.currencyListSig.set(list);
    this.syncPreferencesToServer();
  }

  addCustomCurrency(code: string): void {
    const c = String(code).trim().toUpperCase();
    if (!c || c.length < 2 || c.length > 5) return;
    const list = this.currencyListSig();
    if (list.includes(c)) return;
    const next = [...list, c];
    this.persistCurrencyList(next);
  }

  removeCustomCurrency(code: string): void {
    const list = this.currencyListSig();
    if (list.length <= 1) return;
    const next = list.filter(x => x !== code);
    this.persistCurrencyList(next);
    if (this.currencySig() === code) {
      const newDefault = next[0] as Currency;
      this.setCurrency(newDefault);
    }
  }

  reorderCurrencies(previousIndex: number, currentIndex: number): void {
    const list = [...this.currencyListSig()];
    if (previousIndex === currentIndex || previousIndex < 0 || currentIndex < 0 || previousIndex >= list.length || currentIndex >= list.length) return;
    const [removed] = list.splice(previousIndex, 1);
    list.splice(currentIndex, 0, removed);
    this.persistCurrencyList(list);
  }

  constructor(
    private supabase: SupabaseService,
    private utils: UtilsService,
    private translate: TranslateService
  ) {
    this.applyThemeToDom();
  }

  private syncPreferencesToServer(): void {
    if (!this.currentUserId) return;
    this.supabase.upsertPreferences(this.currentUserId, {
      dark_mode: this.darkModeSig(),
      primary_color: this.primaryColorSig(),
      currency: this.currencySig(),
      currency_list: this.currencyListSig(),
      language: this.languageSig()
    }).catch(() => { /* fire-and-forget; không block UI */ });
  }

  async init(userId: string): Promise<void> {
    this.currentUserId = userId;

    const prefs = await this.supabase.getPreferences(userId);
    if (prefs) {
      this.darkModeSig.set(prefs.dark_mode);
      this.primaryColorSig.set(prefs.primary_color ?? DEFAULT_PRIMARY);
      const list = Array.isArray(prefs.currency_list) && prefs.currency_list.length > 0
        ? prefs.currency_list
        : [...DEFAULT_CURRENCY_LIST];
      this.currencyListSig.set(list);
      const cur = (prefs.currency as Currency) ?? 'VND';
      this.currencySig.set(list.includes(cur) ? cur : (list[0] as Currency));
      const lang = prefs.language === 'vi' ? 'vi' : 'en';
      this.languageSig.set(lang);
      localStorage.setItem(STORAGE_DARK, String(prefs.dark_mode));
      localStorage.setItem(STORAGE_PRIMARY, prefs.primary_color ?? DEFAULT_PRIMARY);
      localStorage.setItem(STORAGE_CURRENCY, this.currencySig());
      localStorage.setItem(STORAGE_CURRENCY_LIST, JSON.stringify(list));
      localStorage.setItem(LANG_STORAGE, lang);
      this.translate.use(lang).subscribe();
    } else {
      await this.supabase.upsertPreferences(userId, {
        dark_mode: this.darkModeSig(),
        primary_color: this.primaryColorSig(),
        currency: this.currencySig(),
        currency_list: this.currencyListSig(),
        language: this.languageSig()
      });
    }

    let cats = await this.supabase.getCategories(userId);
    if (cats.length === 0) {
      const defaultCats = getDefaultCategories(userId);
      const defaultWallets = getDefaultWallets(userId);
      await this.supabase.insertCategories(defaultCats);
      await this.supabase.insertWallets(defaultWallets);
      cats = defaultCats;
    } else {
      const { expenseId, incomeId } = getUncategorizedCategoryIds(userId);
      const hasExp = cats.some(c => c.id === expenseId);
      const hasInc = cats.some(c => c.id === incomeId);
      if (!hasExp || !hasInc) {
        const toInsert = getUncategorizedCategories(userId).filter(c => !cats.some(x => x.id === c.id));
        if (toInsert.length) {
          await this.supabase.insertCategories(toInsert);
          cats = await this.supabase.getCategories(userId);
        }
      }
    }
    const wallets = await this.supabase.getWallets(userId);
    const monthKey = this.utils.getMonthKey(new Date());
    const budgets = await this.supabase.getBudgetsByMonth(userId, monthKey);

    this.categoriesSig.set(cats);
    this.walletsSig.set(wallets);
    this.budgetsSig.set(budgets);
    this.initializedSig.set(true);
    this.applyThemeToDom();
  }

  resetInitialized(): void {
    this.currentUserId = null;
    this.initializedSig.set(false);
    this.categoriesSig.set([]);
    this.walletsSig.set([]);
    this.budgetsSig.set([]);
  }

  private darkenHex(hex: string, percent: number): string {
    const n = hex.replace(/^#/, '');
    const r = parseInt(n.slice(0, 2), 16) / 255;
    const g = parseInt(n.slice(2, 4), 16) / 255;
    const b = parseInt(n.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    l = Math.max(0, Math.min(1, l - percent / 100));
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let r2: number, g2: number, b2: number;
    if (s === 0) r2 = g2 = b2 = l;
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r2 = hue2rgb(p, q, h + 1/3);
      g2 = hue2rgb(p, q, h);
      b2 = hue2rgb(p, q, h - 1/3);
    }
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + toHex(r2) + toHex(g2) + toHex(b2);
  }

  private applyThemeToDom(): void {
    const dark = this.darkModeSig();
    document.documentElement.classList.toggle('dark', dark);
    const primary = this.primaryColorSig();
    const normalized = primary.startsWith('#') ? primary : '#' + primary;
    const primaryDark = this.darkenHex(normalized, 12);
    document.documentElement.style.setProperty('--ml-primary', normalized);
    document.documentElement.style.setProperty('--ml-primary-dark', primaryDark);
    document.documentElement.style.setProperty('--mat-sys-primary', normalized);
    document.documentElement.style.setProperty('--mat-sys-on-primary', '#ffffff');
    document.documentElement.style.setProperty('--mat-sys-primary-container', normalized);
    document.documentElement.style.setProperty('--mat-sys-on-primary-container', '#ffffff');
  }

  setDarkMode(v: boolean): void {
    localStorage.setItem(STORAGE_DARK, String(v));
    this.darkModeSig.set(v);
    document.documentElement.classList.toggle('dark', v);
    this.syncPreferencesToServer();
  }

  setCurrency(c: Currency): void {
    localStorage.setItem(STORAGE_CURRENCY, c);
    this.currencySig.set(c);
    this.syncPreferencesToServer();
  }

  setPrimaryColor(hex: string): void {
    const normalized = hex.startsWith('#') ? hex : '#' + hex;
    localStorage.setItem(STORAGE_PRIMARY, normalized);
    this.primaryColorSig.set(normalized);
    const primaryDark = this.darkenHex(normalized, 12);
    document.documentElement.style.setProperty('--ml-primary', normalized);
    document.documentElement.style.setProperty('--ml-primary-dark', primaryDark);
    document.documentElement.style.setProperty('--mat-sys-primary', normalized);
    document.documentElement.style.setProperty('--mat-sys-on-primary', '#ffffff');
    document.documentElement.style.setProperty('--mat-sys-primary-container', normalized);
    document.documentElement.style.setProperty('--mat-sys-on-primary-container', '#ffffff');
    this.syncPreferencesToServer();
  }

  setLanguage(lang: 'vi' | 'en'): void {
    this.languageSig.set(lang);
    localStorage.setItem(LANG_STORAGE, lang);
    this.translate.use(lang).subscribe();
    this.syncPreferencesToServer();
  }

  applyPrimaryColorToDom(): void {
    this.applyThemeToDom();
  }

  // Categories CRUD
  async loadCategories(userId: string): Promise<void> {
    const list = await this.supabase.getCategories(userId);
    this.categoriesSig.set(list);
  }

  async addCategory(userId: string, cat: Omit<Category, 'id' | 'user_id'>): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await this.supabase.supabase.from('categories').insert({
      ...cat,
      id,
      user_id: userId
    });
    await this.loadCategories(userId);
  }

  async updateCategory(cat: Partial<Category> & { id: string }): Promise<void> {
    await this.supabase.updateCategory(cat);
    const list = this.categoriesSig()
      .map(c => (c.id === cat.id ? { ...c, ...cat } : c))
      .sort((a, b) => a.order - b.order);
    this.categoriesSig.set(list);
  }

  /** Id danh mục "Không phân loại" không được xóa. */
  isUncategorizedCategoryId(id: string, userId: string): boolean {
    const { expenseId, incomeId } = getUncategorizedCategoryIds(userId);
    return id === expenseId || id === incomeId;
  }

  getTransactionCountByCategoryId(userId: string, categoryId: string): Promise<number> {
    return this.supabase.getTransactionCountByCategoryId(userId, categoryId);
  }

  async deleteCategory(userId: string, id: string): Promise<{ movedCount: number }> {
    const cat = this.categoriesSig().find(c => c.id === id);
    if (!cat) throw new Error('Category not found');
    if (this.isUncategorizedCategoryId(id, userId)) throw new Error('Cannot delete Uncategorized category.');
    const { expenseId, incomeId } = getUncategorizedCategoryIds(userId);
    const uncategorizedId = cat.type === 'expense' ? expenseId : incomeId;
    const count = await this.supabase.getTransactionCountByCategoryId(userId, id);
    let movedCount = 0;
    if (count > 0) {
      movedCount = await this.supabase.reassignTransactionsToCategory(userId, id, uncategorizedId);
    }
    await this.supabase.deleteCategory(id);
    await this.loadCategories(userId);
    return { movedCount };
  }

  // Wallets CRUD
  async loadWallets(userId: string): Promise<void> {
    const list = await this.supabase.getWallets(userId);
    this.walletsSig.set(list);
  }

  async addWallet(userId: string, w: Omit<Wallet, 'id' | 'user_id' | 'balance'>): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await this.supabase.supabase.from('wallets').insert({
      ...w,
      id,
      user_id: userId,
      balance: 0
    });
    await this.loadWallets(userId);
  }

  async updateWallet(w: Partial<Wallet> & { id: string }): Promise<void> {
    await this.supabase.updateWallet(w);
    const list = this.walletsSig()
      .map(x => (x.id === w.id ? { ...x, ...w } : x))
      .sort((a, b) => a.order - b.order);
    this.walletsSig.set(list);
  }

  async deleteWallet(userId: string, id: string): Promise<void> {
    const count = await this.supabase.getTransactionCountByWalletId(userId, id);
    if (count > 0) throw new Error('Không thể xóa ví đang có giao dịch.');
    await this.supabase.deleteWallet(id);
    await this.loadWallets(userId);
  }

  // Budgets
  async loadBudgets(userId: string, month: string): Promise<void> {
    const list = await this.supabase.getBudgetsByMonth(userId, month);
    this.budgetsSig.set(list);
  }

  async upsertBudget(b: Budget): Promise<void> {
    await this.supabase.upsertBudget(b);
    const list = this.budgetsSig();
    const idx = list.findIndex(x => x.category_id === b.category_id && x.month === b.month);
    const next = idx >= 0 ? list.map((x, i) => (i === idx ? b : x)) : [...list, b];
    this.budgetsSig.set(next);
  }

  // Transactions (read via supabase; add/update/delete also update local state if needed)
  getTransactions(params: Parameters<SupabaseService['getTransactions']>[0]): Promise<Transaction[]> {
    return this.supabase.getTransactions(params);
  }

  async addTransaction(t: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId: string): Promise<Transaction> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    return this.supabase.insertTransaction({
      ...t,
      id,
      user_id: userId
    });
  }

  async updateTransaction(t: Partial<Transaction> & { id: string }): Promise<void> {
    await this.supabase.updateTransaction(t);
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.supabase.deleteTransaction(id);
  }
}
