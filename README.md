# MoneyLuvr

Ứng dụng quản lý thu chi cá nhân (PWA) – Angular 21, Signals, Angular Material, Supabase.

## Cấu hình Supabase

1. Tạo project tại [Supabase](https://supabase.com), lấy **Project URL** và **anon public** key (Dashboard → Project Settings → API).
2. Tạo các bảng và bật RLS (xem `supabase-schema.sql` và `supabase/migrations/`). Cần bảng: `categories`, `wallets`, `transactions`, `budgets`, `user_preferences`, mỗi bảng có RLS theo `user_id`.
3. **Biến môi trường (không lưu key trong repo):**
   - **Production / Vercel:** Đặt `SUPABASE_URL` và `SUPABASE_ANON_KEY` trong Vercel → Project → Settings → Environment Variables. Lệnh `npm run build` sẽ tạo `environment.production.ts` từ hai biến này.
   - **Local:** Chạy với env: `SUPABASE_URL=... SUPABASE_ANON_KEY=... ng serve` (file `environment.ts` trong repo dùng giá trị rỗng; muốn chạy local với key thì sửa tạm `src/environments/environment.ts` và không commit).

Sau đó chạy `ng serve` và mở `http://localhost:4200/`. Chưa đăng nhập sẽ chuyển đến `/auth`.

---

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project for production, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` then run:

```bash
npm run build
```

This generates `environment.production.ts` from env vars and runs `ng build`. Output is in `dist/moneyluvr-app/browser/`. Do not commit `environment.production.ts` (it is in `.gitignore`).

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
