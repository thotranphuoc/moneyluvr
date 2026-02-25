import {
  Component,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_FORMATS, MAT_NATIVE_DATE_FORMATS } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { UtilsService } from '../../core/utils.service';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormatMoneyPipe } from '../../shared/format-money.pipe';
import type { Category, Budget, Transaction } from '../../models';

const MONTH_YEAR_DATE_FORMATS = {
  ...MAT_NATIVE_DATE_FORMATS,
  display: {
    ...MAT_NATIVE_DATE_FORMATS.display,
    dateInput: { year: 'numeric', month: '2-digit' }
  }
};

@Component({
  selector: 'app-budget',
  standalone: true,
  providers: [{ provide: MAT_DATE_FORMATS, useValue: MONTH_YEAR_DATE_FORMATS }],
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    DragDropModule,
    TranslateModule,
    FormatMoneyPipe,
  ],
  template: `
    <h1 class="page-header">{{ 'pages.budget' | translate }}</h1>
    <div class="controls">
      <mat-form-field appearance="outline" class="month-picker">
        <mat-label>{{ 'common.month' | translate }}</mat-label>
        <input matInput [matDatepicker]="picker" [(ngModel)]="selectedMonth" (dateChange)="onMonthChange($event)" />
        <mat-datepicker #picker startView="year"></mat-datepicker>
      </mat-form-field>
    </div>

    @if (expenseCategories().length) {
      <div class="budget-summary">
        <p class="summary-line">
          {{ 'budget.summary' | translate }}: {{ totalSpent() | formatMoney:currency() }} / {{ totalBudget() | formatMoney:currency() }}
        </p>
      </div>
    }

    <div class="budget-category-list" cdkDropList (cdkDropListDropped)="onCategoryDrop($event)">
      @for (cat of expenseCategories(); track cat.id) {
        <mat-card class="ml-card budget-category-card" cdkDrag>
          <mat-card-content>
            <div class="card-header">
              @if (editingCategoryId() === cat.id) {
                <div class="edit-form">
                  <mat-form-field appearance="outline" class="amount-field">
                    <input matInput type="number" [(ngModel)]="editingAmount" min="0" [placeholder]="'common.amount' | translate" />
                  </mat-form-field>
                  <button mat-icon-button color="primary" (click)="saveBudget(cat)" [attr.aria-label]="'common.save' | translate">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button mat-icon-button (click)="cancelEdit()" [attr.aria-label]="'common.cancel' | translate">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              } @else {
                <span class="cat-dot" [style.background-color]="cat.color || '#64748b'"></span>
                <span class="cat-name">{{ getCategoryDisplayName(cat) }}</span>
                <span class="card-header-spacer"></span>
                <button mat-icon-button (click)="startEdit(cat, budgetByCategory()[cat.id] ?? null)" [attr.aria-label]="'budget.setOrEditLimit' | translate">
                  <mat-icon>edit</mat-icon>
                </button>
              }
            </div>
            <p class="card-limit">
              @if (budgetByCategory()[cat.id]; as b) {
                {{ 'budget.spent' | translate }} {{ (spentByCategory()[cat.id] ?? 0) | formatMoney:currency() }} / {{ b.amount | formatMoney:currency() }}
              } @else {
                {{ 'budget.notSet' | translate }}
              }
            </p>
            <div class="card-progress">
              <mat-progress-bar
                mode="determinate"
                [value]="progressPercent(cat.id)"
                [color]="progressBarColor(cat.id)"
              ></mat-progress-bar>
            </div>
          </mat-card-content>
        </mat-card>
      }
      @empty {
        <p class="empty-msg">{{ 'budget.noExpenseCategories' | translate }}</p>
      }
    </div>
  `,
  styles: [`
    .controls { margin-bottom: 1rem; }
    .month-picker { width: 160px; }
    .budget-summary { margin-bottom: 1rem; }
    .summary-line { margin: 0; font-size: 1rem; font-weight: 500; color: var(--ml-text); }
    .budget-category-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }
    .budget-category-card .mat-mdc-card-content {
      padding: 1rem 1.25rem;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .cat-name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
    .card-header-spacer { flex: 1 1 auto; min-width: 0.5rem; }
    .card-limit {
      margin: 0.35rem 0 0 0;
      font-size: 0.875rem;
      color: var(--ml-text-muted);
    }
    .card-progress {
      margin-top: 0.75rem;
      width: 100%;
    }
    .card-progress ::ng-deep .mat-mdc-progress-bar {
      height: 8px;
      border-radius: 4px;
    }
    .edit-form {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      width: 100%;
    }
    .edit-form .amount-field { width: 140px; flex: 1 1 auto; min-width: 100px; }
    .empty-msg { margin: 0; color: var(--ml-text-muted); }
  `],
})
export class BudgetComponent {
  private data = inject(DataService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  utils = inject(UtilsService);

  monthDate = signal(new Date());
  selectedMonth = new Date(this.monthDate().getFullYear(), this.monthDate().getMonth(), 1);
  monthKey = computed(() => this.utils.getMonthKey(this.monthDate()));
  currency = this.data.currency;

  totalSpent = computed(() => {
    const cats = this.expenseCategories();
    const spent = this.spentByCategory();
    return cats.reduce((sum, c) => sum + (spent[c.id] ?? 0), 0);
  });

  totalBudget = computed(() => {
    const cats = this.expenseCategories();
    const budgets = this.budgetByCategory();
    return cats.reduce((sum, c) => sum + (budgets[c.id]?.amount ?? 0), 0);
  });

  onMonthChange(event: { value: Date | null }): void {
    const d = event.value;
    if (d) {
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      this.monthDate.set(first);
      this.selectedMonth = first;
    }
  }

  monthExpenseTx = signal<Transaction[]>([]);
  expenseCategories = computed(() =>
    this.data.categories().filter((c: Category) => c.type === 'expense')
  );

  spentByCategory = computed(() => {
    const tx = this.monthExpenseTx();
    const cur = this.data.currency();
    const map: Record<string, number> = {};
    for (const t of tx.filter((x) => x.currency === cur)) {
      map[t.category_id] = (map[t.category_id] ?? 0) + t.amount;
    }
    return map;
  });

  budgetByCategory = computed(() => {
    const budgets = this.data.budgets();
    const key = this.monthKey();
    const map: Record<string, Budget> = {};
    for (const b of budgets.filter((x) => x.month === key)) {
      map[b.category_id] = b;
    }
    return map;
  });

  editingCategoryId = signal<string | null>(null);
  editingAmount = 0;

  constructor() {
    effect(() => {
      if (!this.data.initialized()) return;
      const user = this.auth.user();
      if (!user) return;
      const key = this.monthKey();
      this.data.loadBudgets(user.id, key);
      const { from, to } = this.utils.getMonthRange(key);
      this.data.getTransactions({ userId: user.id, from, to, type: 'expense' }).then((list) => {
        this.monthExpenseTx.set(list);
      });
    });
  }

  progressPercent(categoryId: string): number {
    const spent = this.spentByCategory()[categoryId] ?? 0;
    const budget = this.budgetByCategory()[categoryId]?.amount ?? 0;
    if (budget <= 0) return 0;
    return Math.min(100, (spent / budget) * 100);
  }

  progressBarColor(categoryId: string): 'primary' | 'accent' | 'warn' {
    const p = this.progressPercent(categoryId);
    if (p >= 100) return 'warn';
    if (p >= 80) return 'accent';
    return 'primary';
  }

  getCategoryDisplayName(cat: Category): string {
    const uid = this.auth.user()?.id ?? '';
    if (uid && this.data.isUncategorizedCategoryId(cat.id, uid)) return this.translate.instant('categories.uncategorized');
    return cat.name;
  }

  startEdit(cat: Category, existing: Budget | null): void {
    this.editingCategoryId.set(cat.id);
    this.editingAmount = existing?.amount ?? 0;
  }

  cancelEdit(): void {
    this.editingCategoryId.set(null);
  }

  saveBudget(cat: Category): void {
    const user = this.auth.user();
    if (!user) return;
    const key = this.monthKey();
    const existing = this.budgetByCategory()[cat.id];
    const id = existing?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const amount = Number(this.editingAmount) || 0;
    this.data.upsertBudget({ id, user_id: user.id, category_id: cat.id, month: key, amount });
    this.editingCategoryId.set(null);
  }

  async onCategoryDrop(event: CdkDragDrop<Category[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    const cats = [...this.expenseCategories()];
    moveItemInArray(cats, event.previousIndex, event.currentIndex);
    const baseOrder = cats.length ? Math.min(...this.expenseCategories().map(c => c.order)) : 0;
    for (let i = 0; i < cats.length; i++) {
      await this.data.updateCategory({ id: cats[i].id, order: baseOrder + i });
    }
  }
}
