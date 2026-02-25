export type CategoryType = 'expense' | 'income';

/** Mã tiền tệ: VND, USD, SGD mặc định + đơn vị thêm trong Cài đặt. */
export type Currency = string;

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  color?: string;
  order: number;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  order: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: CategoryType;
  category_id: string;
  wallet_id: string;
  date: string;
  currency: Currency;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  amount: number;
}
