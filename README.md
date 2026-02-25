# MoneyLuvr

Ứng dụng quản lý thu chi cá nhân (PWA) – Angular 21, Signals, Angular Material, Supabase.

## Cấu hình Supabase

1. Tạo project tại [Supabase](https://supabase.com), lấy **Project URL** và **anon public** key.
2. Tạo các bảng và bật RLS (xem `PRD-MoneyLuvr.md` mục 4.1). Cần bảng: `categories`, `wallets`, `transactions`, `budgets`, mỗi bảng có `user_id` và RLS `auth.uid() = user_id`.
3. Sửa `src/environments/environment.development.ts` (và `src/environments/environment.ts` nếu build production):
   - `supabase.url`: Project URL
   - `supabase.anonKey`: anon key

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

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

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
