import type { Category, Wallet } from '../../models';

const EXPENSE_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
  '#ff5722', '#795548'
];

const INCOME_COLORS = [
  '#4caf50', '#8bc34a', '#009688', '#00bcd4', '#2196f3',
  '#3f51b5', '#673ab7', '#9c27b0', '#e91e63', '#f44336'
];

const expenseNames = [
  'Ăn uống', 'Thể thao', 'Học tập', 'Xã giao', 'Xăng xe', 'Transport', 'Du lịch', 'Nhà cửa',
  'Sức khỏe', 'Mua sắm', 'Giải trí', 'Con cái', 'Thú cưng', 'Quà tặng & từ thiện',
  'Phí ngân hàng & lệ phí', 'Nợ & trả góp', 'Khác'
];

const incomeNames = [
  'Lương', 'Cổ tức', 'Lợi tức tiết kiệm', 'Thưởng', 'Làm thêm / Freelance', 'Cho thuê', 'Bán đồ',
  'Hoàn tiền / Cashback', 'Trợ cấp / Hỗ trợ', 'Quà tặng / Biếu', 'Lãi đầu tư', 'Khác'
];

export const UNCATEGORIZED_EXPENSE_ID_PREFIX = 'uncategorized-expense-';
export const UNCATEGORIZED_INCOME_ID_PREFIX = 'uncategorized-income-';

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getUncategorizedCategoryIds(userId: string): { expenseId: string; incomeId: string } {
  return {
    expenseId: `${UNCATEGORIZED_EXPENSE_ID_PREFIX}${userId}`,
    incomeId: `${UNCATEGORIZED_INCOME_ID_PREFIX}${userId}`
  };
}

/** Hai danh mục hệ thống "Không phân loại" (expense + income), dùng khi xóa danh mục có giao dịch. */
export function getUncategorizedCategories(userId: string): Category[] {
  const { expenseId, incomeId } = getUncategorizedCategoryIds(userId);
  return [
    { id: expenseId, user_id: userId, name: 'Uncategorized', type: 'expense', color: '#64748b', order: 99998 },
    { id: incomeId, user_id: userId, name: 'Uncategorized', type: 'income', color: '#64748b', order: 99999 }
  ];
}

export function getDefaultCategories(userId: string): Category[] {
  const list: Category[] = [];
  const { expenseId, incomeId } = getUncategorizedCategoryIds(userId);
  expenseNames.forEach((name, i) => {
    list.push({
      id: genId(),
      user_id: userId,
      name,
      type: 'expense',
      color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
      order: i
    });
  });
  incomeNames.forEach((name, i) => {
    list.push({
      id: genId(),
      user_id: userId,
      name,
      type: 'income',
      color: INCOME_COLORS[i % INCOME_COLORS.length],
      order: expenseNames.length + i
    });
  });
  list.push({
    id: expenseId,
    user_id: userId,
    name: 'Uncategorized',
    type: 'expense',
    color: '#64748b',
    order: list.length
  });
  list.push({
    id: incomeId,
    user_id: userId,
    name: 'Uncategorized',
    type: 'income',
    color: '#64748b',
    order: list.length
  });
  return list;
}

export function getDefaultWallets(userId: string): Wallet[] {
  return [
    { id: genId(), user_id: userId, name: 'Tiền mặt', balance: 0, order: 0 },
    { id: genId(), user_id: userId, name: 'Ngân hàng', balance: 0, order: 1 },
    { id: genId(), user_id: userId, name: 'Ví điện tử', balance: 0, order: 2 }
  ];
}
