import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import type { Category, Wallet, Transaction, Budget } from '../../models';

type TableName = 'categories' | 'wallets' | 'transactions' | 'budgets';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: SupabaseClient | null = null;

  get supabase(): SupabaseClient {
    if (!this.client) {
      const { url, anonKey } = environment.supabase;
      if (!url || !anonKey) {
        throw new Error('Supabase URL và anon key chưa được cấu hình. Kiểm tra environment.');
      }
      this.client = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return this.client;
  }

  async getCategories(userId: string): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('order');
    if (error) throw error;
    return (data ?? []) as Category[];
  }

  async getCategoryCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw error;
    return count ?? 0;
  }

  async insertCategories(categories: Category[]): Promise<void> {
    if (categories.length === 0) return;
    const { error } = await this.supabase.from('categories').insert(categories);
    if (error) throw error;
  }

  async updateCategory(cat: Partial<Category> & { id: string }): Promise<void> {
    const { error } = await this.supabase.from('categories').update(cat).eq('id', cat.id);
    if (error) throw error;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  async getTransactionCountByCategoryId(userId: string, categoryId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category_id', categoryId);
    if (error) throw error;
    return count ?? 0;
  }

  /** Chuyển tất cả giao dịch từ danh mục A sang danh mục B (vd. Không phân loại). Trả về số giao dịch đã cập nhật. */
  async reassignTransactionsToCategory(userId: string, fromCategoryId: string, toCategoryId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('transactions')
      .update({ category_id: toCategoryId, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('category_id', fromCategoryId)
      .select('id');
    if (error) throw error;
    return (data ?? []).length;
  }

  async getWallets(userId: string): Promise<Wallet[]> {
    const { data, error } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .order('order');
    if (error) throw error;
    return (data ?? []) as Wallet[];
  }

  async insertWallets(wallets: Wallet[]): Promise<void> {
    if (wallets.length === 0) return;
    const { error } = await this.supabase.from('wallets').insert(wallets);
    if (error) throw error;
  }

  async updateWallet(w: Partial<Wallet> & { id: string }): Promise<void> {
    const { error } = await this.supabase.from('wallets').update(w).eq('id', w.id);
    if (error) throw error;
  }

  async deleteWallet(id: string): Promise<void> {
    const { error } = await this.supabase.from('wallets').delete().eq('id', id);
    if (error) throw error;
  }

  async getTransactionCountByWalletId(userId: string, walletId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('wallet_id', walletId);
    if (error) throw error;
    return count ?? 0;
  }

  async getTransactions(params: {
    userId: string;
    type?: 'expense' | 'income';
    from?: string;
    to?: string;
    categoryId?: string;
    walletId?: string;
  }): Promise<Transaction[]> {
    let q = this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', params.userId)
      .order('date', { ascending: false });
    if (params.type) q = q.eq('type', params.type);
    if (params.from) q = q.gte('date', params.from);
    if (params.to) q = q.lte('date', params.to);
    if (params.categoryId) q = q.eq('category_id', params.categoryId);
    if (params.walletId) q = q.eq('wallet_id', params.walletId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Transaction[];
  }

  async insertTransaction(t: Omit<Transaction, 'created_at' | 'updated_at'>): Promise<Transaction> {
    const now = new Date().toISOString();
    const row = { ...t, created_at: now, updated_at: now };
    const { data, error } = await this.supabase.from('transactions').insert(row).select().single();
    if (error) throw error;
    return data as Transaction;
  }

  async updateTransaction(t: Partial<Transaction> & { id: string }): Promise<void> {
    const { updated_at, ...rest } = t as Transaction;
    const { error } = await this.supabase
      .from('transactions')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', t.id);
    if (error) throw error;
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await this.supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  async getBudgetsByMonth(userId: string, month: string): Promise<Budget[]> {
    const { data, error } = await this.supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month);
    if (error) throw error;
    return (data ?? []) as Budget[];
  }

  async upsertBudget(b: Budget): Promise<void> {
    const { error } = await this.supabase.from('budgets').upsert(b, {
      onConflict: 'user_id,category_id,month'
    });
    if (error) throw error;
  }

  async getAllBudgets(userId: string): Promise<Budget[]> {
    const { data, error } = await this.supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []) as Budget[];
  }

  async getAllTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Transaction[];
  }

  /** Preferences đồng bộ giữa các thiết bị. Trả về null nếu chưa có bản ghi. */
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as UserPreferences | null;
  }

  async upsertPreferences(userId: string, prefs: UserPreferencesRow): Promise<void> {
    const row = {
      user_id: userId,
      dark_mode: prefs.dark_mode ?? false,
      primary_color: prefs.primary_color ?? '#0d9488',
      currency: prefs.currency ?? 'VND',
      currency_list: prefs.currency_list ?? ['VND', 'USD', 'SGD'],
      language: prefs.language ?? 'en'
    };
    const { error } = await this.supabase
      .from('user_preferences')
      .upsert(row, { onConflict: 'user_id' });
    if (error) throw error;
  }
}

export interface UserPreferences {
  user_id: string;
  dark_mode: boolean;
  primary_color: string;
  currency: string;
  currency_list: string[];
  language: string;
}

export interface UserPreferencesRow {
  dark_mode?: boolean;
  primary_color?: string;
  currency?: string;
  currency_list?: string[];
  language?: string;
}
