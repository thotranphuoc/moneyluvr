import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** 'warn' cho hành động xóa/nguy hiểm. */
  confirmColor?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ data.title || ('common.confirm' | translate) }}</h2>
    <mat-dialog-content>
      <p class="confirm-message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="confirm-actions">
      <button mat-button [mat-dialog-close]="false" class="cancel-btn">{{ data.cancelText || ('common.cancel' | translate) }}</button>
      <button mat-flat-button [color]="data.confirmColor || 'primary'" [mat-dialog-close]="true">
        {{ data.confirmText || ('common.confirm' | translate) }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      border-radius: var(--ml-radius, 12px);
    }
    .confirm-message {
      margin: 0;
      white-space: pre-wrap;
      max-width: 320px;
      font-size: 0.9375rem;
      line-height: 1.5;
      color: var(--ml-text, #1e293b);
    }
    h2.mat-mdc-dialog-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
    }
    .confirm-actions {
      padding: 1rem 0 0 0;
      gap: 0.5rem;
      min-height: auto;
    }
    .cancel-btn {
      color: var(--ml-text-muted, #64748b) !important;
    }
  `]
})
export class ConfirmDialogComponent {
  readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
}
