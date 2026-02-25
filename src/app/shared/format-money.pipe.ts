import { Pipe, PipeTransform, inject } from '@angular/core';
import { DataService } from '../core/data.service';
import { UtilsService } from '../core/utils.service';
import type { Currency } from '../models';

@Pipe({ name: 'formatMoney', standalone: true })
export class FormatMoneyPipe implements PipeTransform {
  private data = inject(DataService);
  private utils = inject(UtilsService);

  transform(amount: number, currency?: Currency): string {
    const c = currency ?? this.data.currency();
    return this.utils.formatMoney(amount, c);
  }
}
