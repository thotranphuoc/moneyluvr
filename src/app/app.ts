import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from './core/auth.service';
import { DataService } from './core/data.service';

const LANG_STORAGE = 'moneyluvr_lang';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  auth = inject(AuthService);
  private data = inject(DataService);
  private translate = inject(TranslateService);

  /** Chỉ hiển thị nội dung sau khi đã tải xong file dịch, tránh hiện key thay vì chữ. */
  translationsReady = signal(false);

  ngOnInit(): void {
    const lang = this.data.language() || 'en';
    this.translate.use(lang).subscribe({
      next: () => this.translationsReady.set(true),
      error: () => {
        this.translationsReady.set(true);
      }
    });
  }
}
