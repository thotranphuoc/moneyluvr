import {
  Component,
  inject,
  signal,
  computed,
  effect,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule, MatDatepicker } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule, MAT_DATE_FORMATS, MAT_NATIVE_DATE_FORMATS } from '@angular/material/core';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { UtilsService } from '../../core/utils.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormatMoneyPipe } from '../../shared/format-money.pipe';
import type { Currency, Transaction } from '../../models';
import Chart from 'chart.js/auto';

interface CategorySum {
  name: string;
  color: string;
  total: number;
}

const MONTH_YEAR_DATE_FORMATS = {
  ...MAT_NATIVE_DATE_FORMATS,
  display: {
    ...MAT_NATIVE_DATE_FORMATS.display,
    dateInput: { year: 'numeric', month: '2-digit' }
  }
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatIconModule,
    MatNativeDateModule,
    TranslateModule,
    FormatMoneyPipe
  ],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: MONTH_YEAR_DATE_FORMATS }],
  template: `
    <div class="header-row">
      <h1 class="page-header">{{ 'pages.overview' | translate }}</h1>
      <mat-form-field appearance="outline" class="month-picker">
        <mat-label>{{ 'common.month' | translate }}</mat-label>
        <input matInput [matDatepicker]="picker" [(ngModel)]="selectedMonth" (dateChange)="onMonthChange($event)" />
        <mat-datepicker #picker startView="year"></mat-datepicker>
      </mat-form-field>
    </div>
    <div class="currency-row">
      <div class="currency-tabs">
        @for (c of data.supportedCurrencies(); track c) {
          <button mat-button (click)="currencyTab.set(c)" [class.active]="currencyTab() === c">{{ c }}</button>
        }
      </div>
    </div>
    <div class="cards">
      <mat-card class="ml-card stat-card stat-income">
        <mat-card-content class="stat-card-inner">
          <mat-icon class="stat-icon stat-icon-income">trending_up</mat-icon>
          <div class="stat-text">
            <span class="stat-title">{{ 'dashboard.totalIncome' | translate }}</span>
            <span class="stat-value">{{ totalIncome() | formatMoney:currencyTab() }}</span>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card class="ml-card stat-card stat-expense">
        <mat-card-content class="stat-card-inner">
          <mat-icon class="stat-icon stat-icon-expense">trending_down</mat-icon>
          <div class="stat-text">
            <span class="stat-title">{{ 'dashboard.totalExpense' | translate }}</span>
            <span class="stat-value">{{ totalExpense() | formatMoney:currencyTab() }}</span>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card class="ml-card stat-card stat-balance" [class.stat-negative]="balance() < 0">
        <mat-card-content class="stat-card-inner">
          <mat-icon class="stat-icon stat-icon-balance">account_balance</mat-icon>
          <div class="stat-text">
            <span class="stat-title">{{ 'dashboard.balance' | translate }}</span>
            <span class="stat-value">{{ balance() | formatMoney:currencyTab() }}</span>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
    <div class="charts">
      <mat-card class="ml-card chart-card">
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.spendingByCategory' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-wrap">
            <canvas #chartExpense></canvas>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card class="ml-card chart-card">
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.incomeBySource' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="chart-wrap">
            <canvas #chartIncome></canvas>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .header-row .page-header {
      margin: 0;
    }
    .month-picker { width: 160px; }
    .currency-row {
      margin-bottom: 1.5rem;
    }
    .currency-tabs {
      display: flex;
      gap: 0.25rem;
      background: var(--ml-bg);
      padding: 0.25rem;
      border-radius: var(--ml-radius);
      border: 1px solid var(--ml-border);
    }
    .currency-tabs button {
      text-transform: none;
      font-weight: 500;
      border-radius: 8px;
    }
    .currency-tabs button.active {
      background: var(--ml-bg-card);
      color: var(--ml-primary);
      box-shadow: var(--ml-shadow);
    }
    @keyframes dashboardFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .cards {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
      animation: dashboardFadeIn 400ms ease-out forwards;
    }
    .stat-card {
      transition: transform 0.2s, box-shadow 0.2s;
      min-width: 0;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--ml-shadow-lg);
    }
    .stat-card-inner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0 !important;
    }
    .stat-icon {
      width: 40px;
      height: 40px;
      font-size: 40px;
      flex-shrink: 0;
    }
    .stat-icon-income { color: var(--ml-success); }
    .stat-icon-expense { color: var(--ml-error); }
    .stat-icon-balance { color: var(--ml-primary); }
    .stat-card.stat-negative .stat-icon-balance { color: var(--ml-error); }
    .stat-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }
    .stat-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--ml-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      white-space: normal;
      word-break: break-word;
    }
    .stat-income .stat-value { color: var(--ml-success); }
    .stat-expense .stat-value { color: var(--ml-error); }
    .stat-balance .stat-value { color: var(--ml-primary); }
    .stat-balance.stat-negative .stat-value { color: var(--ml-error); }
    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
      animation: dashboardFadeIn 400ms ease-out 100ms forwards;
      opacity: 0;
    }
    .chart-card { min-width: 0; }
    .chart-card .mat-mdc-card-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ml-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .chart-wrap {
      position: relative;
      max-width: 280px;
      margin: 0 auto;
    }
    .chart-wrap canvas { max-width: 100%; height: auto !important; }
  `]
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  data = inject(DataService);
  private auth = inject(AuthService);
  private utils = inject(UtilsService);
  private translate = inject(TranslateService);

  @ViewChild('chartExpense') chartExpenseRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartIncome') chartIncomeRef!: ElementRef<HTMLCanvasElement>;

  private chartExpense: Chart<'doughnut'> | null = null;
  private chartIncome: Chart<'doughnut'> | null = null;

  monthDate = signal(new Date());
  selectedMonth: Date = new Date();
  currencyTab = signal<Currency>(this.data.currency() ?? 'VND');
  monthTransactions = signal<Transaction[]>([]);

  monthKey = computed(() => this.utils.getMonthKey(this.monthDate()));

  private filteredTx = computed(() => {
    const tx = this.monthTransactions();
    const cur = this.currencyTab();
    return tx.filter(t => t.currency === cur);
  });

  totalIncome = computed(() =>
    this.filteredTx().filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  );
  totalExpense = computed(() =>
    this.filteredTx().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );
  balance = computed(() => this.totalIncome() - this.totalExpense());

  expenseByCategory = computed((): CategorySum[] => {
    const tx = this.filteredTx().filter(t => t.type === 'expense');
    const categories = this.data.categories();
    const userId = this.auth.user()?.id ?? '';
    const map = new Map<string, number>();
    for (const t of tx) {
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([catId, total]) => {
        const cat = categories.find(c => c.id === catId);
        const name = cat && userId && this.data.isUncategorizedCategoryId(cat.id, userId)
          ? this.translate.instant('categories.uncategorized')
          : (cat?.name ?? catId);
        return { name, color: cat?.color ?? '#64748b', total };
      })
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total);
  });

  incomeByCategory = computed((): CategorySum[] => {
    const tx = this.filteredTx().filter(t => t.type === 'income');
    const categories = this.data.categories();
    const userId = this.auth.user()?.id ?? '';
    const map = new Map<string, number>();
    for (const t of tx) {
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([catId, total]) => {
        const cat = categories.find(c => c.id === catId);
        const name = cat && userId && this.data.isUncategorizedCategoryId(cat.id, userId)
          ? this.translate.instant('categories.uncategorized')
          : (cat?.name ?? catId);
        return { name, color: cat?.color ?? '#64748b', total };
      })
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total);
  });

  onMonthChange(event: { value: Date | null }): void {
    if (event.value) {
      this.monthDate.set(event.value);
      this.selectedMonth = event.value;
    }
  }

  constructor() {
    effect(() => {
      if (!this.data.initialized()) return;
      const user = this.auth.user();
      if (!user) return;
      const key = this.monthKey();
      const { from, to } = this.utils.getMonthRange(key);
      this.data.getTransactions({ userId: user.id, from, to }).then(list => {
        this.monthTransactions.set(list);
      });
    });
    effect(() => {
      this.expenseByCategory();
      this.incomeByCategory();
      this.updateCharts();
    });
  }

  ngAfterViewInit(): void {
    this.initCharts();
  }

  ngOnDestroy(): void {
    this.chartExpense?.destroy();
    this.chartIncome?.destroy();
  }

  private initCharts(): void {
    const expenseCanvas = this.chartExpenseRef?.nativeElement;
    const incomeCanvas = this.chartIncomeRef?.nativeElement;
    if (!expenseCanvas || !incomeCanvas) return;

    const currency = this.currencyTab();
    const formatTooltip = (value: number) =>
      `${this.utils.formatMoney(value, currency)}`;

    this.chartExpense = new Chart(expenseCanvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{ data: [], backgroundColor: [] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 800 },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = total ? ((ctx.raw as number) / total * 100).toFixed(1) : '0';
                return `${ctx.label}: ${formatTooltip(ctx.raw as number)} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    this.chartIncome = new Chart(incomeCanvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{ data: [], backgroundColor: [] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 800 },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = total ? ((ctx.raw as number) / total * 100).toFixed(1) : '0';
                return `${ctx.label}: ${formatTooltip(ctx.raw as number)} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    this.updateCharts();
  }

  private updateCharts(): void {
    const expense = this.expenseByCategory();
    const income = this.incomeByCategory();

    if (this.chartExpense) {
      this.chartExpense.data.labels = expense.map(x => x.name);
      this.chartExpense.data.datasets[0].data = expense.map(x => x.total);
      this.chartExpense.data.datasets[0].backgroundColor = expense.map(x => x.color);
      this.chartExpense.update();
    }
    if (this.chartIncome) {
      this.chartIncome.data.labels = income.map(x => x.name);
      this.chartIncome.data.datasets[0].data = income.map(x => x.total);
      this.chartIncome.data.datasets[0].backgroundColor = income.map(x => x.color);
      this.chartIncome.update();
    }
  }
}
