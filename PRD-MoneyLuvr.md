# PRD – MoneyLuvr

**Product Requirements Document**  
Ứng dụng quản lý thu chi cá nhân (PWA).  
Dùng cho AI/team build lại hoặc mở rộng ứng dụng.

---

## 1. Tổng quan

- **Tên sản phẩm:** MoneyLuvr  
- **Mục đích:** Theo dõi thu nhập, chi tiêu, ngân sách theo danh mục và ví; đồng bộ theo tài khoản; hỗ trợ đa tiền tệ (VND, USD, SGD).  
- **Đối tượng:** Cá nhân muốn quản lý tài chính hàng ngày.  
- **Công nghệ yêu cầu:**
  - **Frontend:** Angular 21, standalone components, **Signals** (signal/computed/effect), **Angular Material**
  - **Backend / Auth:** **Supabase** (PostgreSQL + Auth + Row Level Security)
  - **PWA:** Service Worker (Angular), có thể chạy offline cho shell
  - **Ngôn ngữ giao diện:** Tiếng Việt

---

## 2. Kiến trúc kỹ thuật

### 2.1 Stack

| Thành phần      | Công nghệ |
|-----------------|-----------|
| Framework       | Angular 21 |
| State / Reactivity | Angular Signals (signal, computed, effect) |
| UI              | Angular Material (mat-card, mat-form-field, mat-button, mat-select, mat-datepicker, mat-toolbar, mat-icon, mat-slide-toggle, mat-progress-bar, mat-snack-bar) |
| Routing         | Angular Router, lazy load từng page |
| Backend         | Supabase (PostgreSQL) |
| Auth            | Supabase Auth (email/password) |
| Biểu đồ         | Chart.js (doughnut) |
| PWA             | @angular/service-worker (ngsw) |
| Date handling   | YYYY-MM-DD cho date; month key YYYY-MM |

### 2.2 Cấu trúc thư mục gợi ý

- **Environment:** Dùng `environment.ts` (hoặc inject qua `app.config`) cho Supabase `url` và `anon key` — không hardcode trong mã.
- **Core/db:** Có thể đặt tên `core/supabase/` thay vì `core/db/` nếu chỉ dùng Supabase (không có migration SQL trong repo). Hoặc giữ `db/` và thêm file schema/migration tham chiếu.

```
app/
  app.component.ts
  app.config.ts
  app.routes.ts
  core/
    guards/
      auth.guard.ts          # Bảo vệ route: chỉ cho phép khi authReady và user !== null
    auth.service.ts          # Supabase Auth
    data.service.ts          # State chung (categories, wallets, budgets, theme)
    utils.service.ts         # Date, format tiền
    db/                      # hoặc supabase/
      supabase.service.ts    # Gọi Supabase (CRUD)
      seed-data.ts           # Danh mục/ví mặc định
  layout/
    layout.component.ts      # Toolbar + bottom nav + router-outlet
  auth/
    auth.component.ts        # Đăng nhập / Đăng ký / Quên mật khẩu
  pages/
    dashboard/
    income/
    expense/
    budget/
    settings/
  shared/
    components/              # Component dùng lại: confirm dialog, date-range picker, card wrapper...
    format-money.pipe.ts
  models/
    index.ts                 # Category, Wallet, Transaction, Budget
```

### 2.3 Luồng ứng dụng

1. **Khởi động:** Hiển thị "Đang tải..." cho đến khi Supabase Auth ready.  
2. **Route protection:** Dùng **AuthGuard** bảo vệ các route `/`, `/income`, `/expense`, `/budget`, `/settings` — chỉ cho phép khi `authReady()` và `user() !== null`; nếu chưa đăng nhập thì redirect về màn Auth (ví dụ `/auth`).  
3. **Chưa đăng nhập:** Hiển thị màn hình Auth (đăng nhập/đăng ký).  
4. **Đã đăng nhập:** Gọi `DataService.init()` (load categories, wallets, budgets tháng hiện tại); hiển thị "Đang tải dữ liệu..." nếu chưa xong.  
5. **Đã init:** Hiển thị Layout (toolbar + bottom nav) và `<router-outlet>`.  
6. **Theme:** Dark mode và màu chủ đạo (primary) lưu localStorage, áp dụng lên DOM (CSS variables / Material theme).

---

## 3. Xác thực (Auth)

- **Nhà cung cấp:** Supabase Auth.  
- **Phương thức:** Email + mật khẩu.
- **Xác thực email (Confirm email):** Ghi rõ trong cấu hình Supabase có bật "Confirm email" hay không. Nếu bật: sau đăng ký hiển thị thông báo "Vui lòng xác thực email. Kiểm tra hộp thư và bấm link xác nhận."; xử lý deep link / redirect sau khi user bấm link confirm (Supabase Auth xử lý session).

### 3.1 Chức năng

| Chức năng | Mô tả |
|-----------|--------|
| Đăng nhập | Email + mật khẩu; hiển thị lỗi (email/mật khẩu sai, email không hợp lệ). |
| Đăng ký | Email + mật khẩu + xác nhận mật khẩu; validate mật khẩu ≥ 6 ký tự; thông báo "Email đã được đăng ký" nếu trùng. |
| Quên mật khẩu | Gửi email đặt lại mật khẩu qua Supabase; thông báo "Đã gửi email... Kiểm tra hộp thư." |
| Đăng xuất | Gọi Supabase signOut; sau đó hiển thị lại màn Auth. |

### 3.2 AuthService (API gợi ý)

- `user: Signal<User | null>` – user hiện tại hoặc null.  
- `authReady: Signal<boolean>` – true sau khi đã có kết quả từ `onAuthStateChange` lần đầu.  
- `login(email, password): Promise<void>`  
- `register(email, password): Promise<void>`  
- `logout(): Promise<void>`  
- `sendPasswordResetEmail(email): Promise<void>`  

Sau khi đăng nhập/đăng ký thành công, dùng Snackbar thông báo ngắn (2–4 giây).

---

## 4. Dữ liệu & Backend (Supabase)

### 4.1 Mô hình dữ liệu

Tất cả bảng đều có `user_id` (uuid, FK tới `auth.users.id`) và dùng **Row Level Security (RLS)** để chỉ user đó được SELECT/INSERT/UPDATE/DELETE trên dữ liệu của mình.

#### Category

| Cột | Kiểu | Ghi chú |
|-----|------|--------|
| id | text (PK) | ID do app sinh (ví dụ timestamp-random hoặc UUID) |
| user_id | uuid | FK auth.users |
| name | text | Tên danh mục |
| type | text | 'expense' \| 'income' |
| color | text | Màu hex (optional) |
| order | integer | Thứ tự hiển thị |

**Xóa danh mục:** Không cho xóa nếu còn giao dịch tham chiếu (giống wallet). Hiển thị lỗi rõ ràng. Hoặc quy định thay thế: cho phép xóa và gán các transaction của danh mục đó sang danh mục "Khác" / category mặc định — chọn một trong hai và áp dụng thống nhất.

#### Wallet

| Cột | Kiểu | Ghi chú |
|-----|------|--------|
| id | text (PK) | ID do app sinh |
| user_id | uuid | FK auth.users |
| name | text | Tên ví |
| balance | number | Số dư: (1) **Manual** — chỉ dùng làm "số dư ban đầu", app không tự cập nhật khi thêm/xóa giao dịch; hoặc (2) **Computed** — số dư hiện tại = sum(income) − sum(expense) theo wallet_id (khi đó có thể bỏ cột và luôn tính từ transactions). Chọn một và ghi rõ trong logic. Mặc định 0. |
| order | integer | Thứ tự hiển thị |

#### Transaction

| Cột | Kiểu | Ghi chú |
|-----|------|--------|
| id | text (PK) | ID do app sinh |
| user_id | uuid | FK auth.users |
| amount | number | Số tiền |
| type | text | 'expense' \| 'income' |
| category_id | text | FK categories.id |
| wallet_id | text | FK wallets.id |
| date | text | YYYY-MM-DD |
| currency | text | 'VND' \| 'USD' \| 'SGD', mặc định VND |
| note | text | Optional |
| created_at | text | ISO string (optional) |
| updated_at | text | ISO string (optional); dùng cho audit và sync/conflict resolution |

**Index gợi ý:** `(user_id, date DESC)`, `(user_id, type)`, `(user_id, wallet_id)`.

#### Budget

| Cột | Kiểu | Ghi chú |
|-----|------|--------|
| id | text (PK) | ID do app sinh |
| user_id | uuid | FK auth.users |
| category_id | text | FK categories.id (chỉ expense) |
| month | text | YYYY-MM |
| amount | number | Giới hạn chi cho danh mục trong tháng |

**Ràng buộc:** Mỗi (user_id, category_id, month) tối đa một bản ghi (unique).

### 4.2 Seed dữ liệu (user mới)

Khi `init()` lần đầu và user chưa có category nào:

- Insert **danh mục mặc định** (thu + chi) từ seed-data.  
- Insert **ví mặc định**: Tiền mặt, Ngân hàng, Ví điện tử (balance 0, order 0,1,2).

Danh mục chi mặc định gợi ý: Ăn uống, Thể thao, Học tập, Xã giao, Xăng xe, Transport, Du lịch, Nhà cửa, Sức khỏe, Mua sắm, Giải trí, Con cái, Thú cưng, Quà tặng & từ thiện, Phí ngân hàng & lệ phí, Nợ & trả góp, Khác.  
Danh mục thu: Lương, Cổ tức, Lợi tức tiết kiệm, Thưởng, Làm thêm/Freelance, Cho thuê, Bán đồ, Hoàn tiền/Cashback, Trợ cấp/Hỗ trợ, Quà tặng/Biếu, Lãi đầu tư, Khác.  
Mỗi danh mục có `type`, `color` (hex), `order`.

### 4.3 DataService (tầng state chung)

- **Signals:** `categories`, `wallets`, `budgets`, `initialized`, `darkMode`, `currency`, `primaryColor`.  
- **Init:** Gọi backend load categories, wallets; nếu categories rỗng thì seed categories + wallets; load budgets tháng hiện tại; set `initialized = true`.  
- **CRUD:** Các method gọi Supabase service rồi cập nhật signal (ví dụ sau add/update/delete category thì load lại categories).  
- **Theme:** `setDarkMode`, `setCurrency`, `setPrimaryColor` (lưu localStorage + signal); `applyPrimaryColorToDom()` áp dụng màu lên document (CSS vars / Material).  
- **Reset:** Khi logout gọi `resetInitialized()` để lần đăng nhập sau hiển thị loading và chạy init lại.

---

## 5. Các trang (Pages) & Tính năng

### 5.1 Routing

- **AuthGuard:** Áp dụng cho các route `/`, `/income`, `/expense`, `/budget`, `/settings`. Khi chưa đăng nhập (`authReady()` và `user() === null`) thì redirect về `/auth` (hoặc path auth đã chọn).

| Path | Component | Ghi chú |
|------|-----------|--------|
| `/auth` | Auth | Đăng nhập / Đăng ký / Quên mật khẩu (route công khai) |
| `/` | Dashboard | Tổng quan (có guard) |
| `/income` | Income | Thu nhập (có guard) |
| `/expense` | Expense | Chi tiêu (có guard) |
| `/budget` | Budget | Ngân sách (có guard) |
| `/settings` | Settings | Cài đặt (có guard) |
| `/categories` | Redirect → `/settings` | |
| `/transactions` | Redirect → `/expense` (hoặc trang Transactions nếu có) | |
| `**` | Redirect → `/` | |

### 5.2 Layout

- **Toolbar trên:** Logo "MoneyLuvr" (link về `/`), nav link: Tổng quan, Thu nhập, Chi tiêu, Ngân sách, Cài đặt. Màu toolbar = primary (theme).  
- **Bottom navigation (mobile):** Chỉ hiển thị khi viewport nhỏ (ví dụ ≤600px); 5 nút: Tổng quan (dashboard icon), Thu nhập (trending_up), Chi tiêu (trending_down), Ngân sách (account_balance_wallet), Cài đặt (settings). Active state: nền rgba trắng 0.2.  
- **Content:** `<main class="content">` bọc `<router-outlet>`, max-width ~56rem, padding 1rem, căn giữa.

### 5.3 Dashboard (Tổng quan)

- **Header:** Tiêu đề "Tổng quan", chọn **Tháng** (MatDatepicker, startView = year), format MM/yyyy.  
- **Tab tiền tệ:** Nút chọn VND \| USD \| SGD; chỉ hiển thị số liệu giao dịch có currency tương ứng.  
- **Ba thẻ (cards):**  
  - Tổng thu (tháng đang chọn); ghi thêm "Tháng trước: X" nếu có.  
  - Tổng chi; "Tháng trước: X" nếu có.  
  - Cân đối (thu − chi); hiển thị class negative nếu âm; "Tháng trước: X" nếu có.  
- **Cảnh báo ngân sách (chỉ khi currency = VND):** Một card liệt kê các danh mục có ngân sách đã dùng ≥ 80% (đã dùng X / budget Y, phần trăm).  
- **Hai biểu đồ Doughnut (Chart.js):**  
  - Chi tiêu theo danh mục (màu theo category, tooltip số tiền + %).  
  - Thu nhập theo nguồn (danh mục thu).  
- Dữ liệu: Query transactions tháng đang chọn + tháng trước; query budgets tháng đang chọn. Dùng computed từ signals để tổng hợp theo category và currency.

### 5.4 Thu nhập (Income)

- **Header:** "Thu nhập", nút "+ Thêm thu nhập" (toggle form).  
- **Bộ lọc:**  
  - Từ ngày, Đến ngày (MatDatepicker, date only).  
  - Lọc theo ví: dropdown (Tất cả ví + từng wallet).  
- **Form thêm/sửa (trong card):**  
  - Số tiền (number, required).  
  - Loại tiền: VND \| USD \| SGD.  
  - Danh mục: chỉ danh mục type = income.  
  - Ví: chọn wallet.  
  - Ngày (date).  
  - Ghi chú (optional).  
  - Nút Thêm/Cập nhật, Hủy.  
- **Danh sách:** Mỗi dòng: tên danh mục, meta (ngày · ví · ghi chú nếu có), số tiền (+format theo currency), nút Sửa, nút Xóa. Xóa có confirm.  
- Mặc định filter: từ ngày – đến ngày = tháng hiện tại (getCurrentMonthRange). Khi đổi từ/đến/ví thì gọi lại API getTransactions với filter type=income.

### 5.5 Chi tiêu (Expense)

- Giống trang Thu nhập nhưng:  
  - Tiêu đề "Chi tiêu", nút "+ Thêm chi tiêu".  
  - Filter và form tương tự; danh mục chỉ type = expense.  
  - Số tiền hiển thị với dấu − (âm).  
- API filter: type=expense.

### 5.6 Giao dịch (Transactions) – tùy chọn

- Trang gộp thu + chi trong một list: filter theo tháng (input month), loại (Tất cả / Chi tiêu / Thu nhập), ví.  
- Form thêm/sửa: có thêm field Loại (Thu nhập / Chi tiêu); danh mục thay đổi theo loại.  
- List hiển thị cả thu và chi (dấu + / −), cùng format và nút Sửa/Xóa.  
- Có thể redirect `/transactions` → `/expense` nếu không cần trang riêng.

### 5.6a Chuyển tiền giữa các ví (Transfer)

- **Phase 1 (hiện tại):** Chưa có flow riêng "Chuyển ví". Hướng dẫn user tạo 2 giao dịch thủ công: 1 chi tiêu từ ví nguồn (danh mục có thể "Chuyển tiền" hoặc "Khác") và 1 thu nhập vào ví đích cùng số tiền, cùng ngày; ghi chú có thể ghi "Chuyển từ [tên ví nguồn]".  
- **Tùy chọn phase 2:** Thêm flow "Chuyển ví": chọn Ví nguồn, Ví đích, Số tiền, Ngày → tạo 1 expense (ví nguồn) + 1 income (ví đích), có thể link bằng `transfer_pair_id` (cột optional trên transaction) hoặc note chung.

### 5.7 Ngân sách (Budget)

- **Header:** "Ngân sách", chọn Tháng (MatDatepicker, startView = year).  
- Đoạn mô tả ngắn: Đặt giới hạn chi theo danh mục; cảnh báo trên Tổng quan khi gần/vượt.  
- **Danh sách:** Mỗi dòng = một danh mục chi (expense categories):  
  - Tên danh mục + chấm màu.  
  - Đã chi / Ngân sách (format tiền).  
  - Nút "Đặt" hoặc "Sửa": chuyển sang chế độ nhập số (input number), nút Lưu, Hủy.  
- **Progress bar:** Với mỗi danh mục đã đặt budget > 0: thanh tiến độ (đã chi / budget). Màu: primary (< 80%), accent (80–99%), warn (≥ 100%).  
- Budget lưu theo (user, category_id, month). Load budgets tháng đang chọn; load spent bằng getTransactions(from, to, type=expense) rồi tổng theo categoryId.

### 5.8 Cài đặt (Settings)

- **Tài khoản:** Mô tả "Đăng xuất để đăng nhập tài khoản khác. Dữ liệu đồng bộ theo tài khoản."; nút Đăng xuất (color warn).  
- **Giao diện:**  
  - Mat-slide-toggle: Chế độ tối (Dark mode); lưu và áp dụng qua DataService.  
  - Màu chủ đạo: input color + input text hex; áp dụng lên toolbar, bottom nav, nút (CSS variables / Material primary).  
- **Đơn vị tiền tệ:** Mat-select: VND \| USD \| SGD (lưu vào DataService + localStorage, dùng làm mặc định hiển thị khi không ghi rõ currency).  
- **Ví / Tài khoản:**  
  - Mô tả ngắn.  
  - Nút "+ Thêm ví"; form inline: Tên ví, Cập nhật/Thêm, Hủy.  
  - List ví: tên, nút Sửa, nút Xóa. Xóa ví: không cho xóa nếu còn giao dịch thuộc ví đó; hiển thị lỗi rõ ràng.  
- **Danh mục:**  
  - Nút "+ Thêm danh mục". Form: Tên, Loại (Chi tiêu / Thu nhập), Màu (bảng màu cố định); khi sửa không đổi Loại.  
  - Hai cột: Chi tiêu (list category type=expense), Thu nhập (type=income); mỗi dòng có chấm màu, tên, Sửa, Xóa.  
- **Sao lưu & Khôi phục:**  
  - Export CSV: tải file CSV (Ngày, Loại, Danh mục, Ví, Số tiền, Ghi chú); BOM UTF-8; tên file moneyluvr-YYYY-MM-DD.csv.  
  - Backup JSON: tải file JSON chứa exportDate, version, categories, wallets, transactions, budgets; tên moneyluvr-backup-YYYY-MM-DD.json.  
  - Khôi phục từ JSON: chọn file .json; parse và gọi API import (insert/upsert categories, wallets, transactions, budgets); sau đó load lại categories/wallets và reload trang (hoặc re-init).  
  - **Quy định Import:** (1) **Khi trùng id:** ghi đè (overwrite), bỏ qua (skip), hoặc merge — chọn một và áp dụng thống nhất (ví dụ: ghi đè cho categories/wallets/budgets; bỏ qua hoặc ghi đè cho transactions). (2) **Chế độ import:** thay thế toàn bộ dữ liệu hiện tại (replace) hay cộng dồn vào dữ liệu hiện tại (merge). Ghi rõ trong UI và trong logic backend.

Export/Import dùng dữ liệu từ Supabase (get all transactions, categories, wallets, budgets; import ghi vào Supabase với user_id hiện tại).

---

## 6. Helpers & Chi tiết kỹ thuật

### 6.1 UtilsService

- `getTodayLocalYYYYMMDD(): string`  
- `dateToLocalYYYYMMDD(d: Date): string`  
- `parseLocalDate(s: string): Date | null` (YYYY-MM-DD)  
- `getMonthKey(date: Date): string` → YYYY-MM  
- `getMonthRange(monthKey: string): { from: string; to: string }` (from/to YYYY-MM-DD)  
- `getCurrentMonthRange(): { from, to }` (tháng hiện tại)  
- `getPrevMonth(monthKey: string): string` (tháng trước)  
- `formatMoney(amount, currency)`: VND → format vi-VN + " ₫"; USD/SGD → style currency en-US  

### 6.2 FormatMoneyPipe

- Input: amount (number), currency (string, optional). Nếu không truyền currency thì dùng DataService.currency().  
- Output: chuỗi format giống UtilsService.formatMoney.

### 6.3 Format số & ngày

- Tiền VND: không thập phân; ngăn cách hàng nghìn (vi-VN).  
- USD/SGD: format currency chuẩn.  
- Ngày hiển thị: YYYY-MM-DD hoặc dd/MM/yyyy tùy UX; lưu trong DB là YYYY-MM-DD.  
- Tháng: YYYY-MM.

### 6.4 Theme & PWA

- Dark mode: class `dark` trên `document.documentElement`; Material và CSS tương thích.  
- Primary color: lưu hex trong localStorage; set CSS variables (ví dụ `--app-primary`, `--mat-sys-primary`) và class theme (nếu dùng nhiều theme).  
- PWA: Service Worker đăng ký (registerWhenStable); có thể cache shell và assets; không bắt buộc offline đầy đủ cho API.

---

## 7. Yêu cầu phi chức năng

- **Performance:** Dùng Signals; tránh load lại dữ liệu không cần thiết (có thể cache theo session cho cùng filter).  
- **Security:** Toàn bộ bảng Supabase dùng RLS với `auth.uid() = user_id`.  
- **Accessibility:** Nút có aria-label; form có mat-label.  
- **Responsive:** Layout đủ dùng trên mobile; bottom nav chỉ hiện trên màn nhỏ.  
- **Ngôn ngữ:** Toàn bộ label, nút, thông báo bằng tiếng Việt.

---

## 8. Tóm tắt API Backend (Supabase)

- **Auth:** signInWithPassword, signUp, signOut, resetPasswordForEmail, onAuthStateChange.  
- **Categories:** select (order by order), insert, update, delete; get count (cho seed); count transactions by category_id (để chặn xóa danh mục đang có giao dịch, nếu chọn quy định "không cho xóa").  
- **Wallets:** select (order by order), insert, update, delete; count transactions by wallet_id (để chặn xóa ví đang có giao dịch).  
- **Transactions:** select với filter (user_id, type?, date >= from, date <= to, category_id?, wallet_id?); order by date desc; insert, update, delete; khi insert/update set hoặc cập nhật `updated_at`.  
- **Budgets:** select by user_id + month; upsert (insert hoặc update theo category_id + month); get all (cho export).  
- **Import:** bulk insert/upsert categories, wallets, transactions, budgets (user_id = current user); quy định conflict (trùng id) và chế độ replace vs merge.

---

## 9. Checklist cho AI / Developer

- [ ] Supabase project: bảng categories, wallets, transactions, budgets với user_id và RLS; bảng transactions có cột `updated_at`.  
- [ ] Auth: Supabase Auth; AuthService với user, authReady, login, register, logout, sendPasswordResetEmail.  
- [ ] AuthGuard: bảo vệ route `/`, `/income`, `/expense`, `/budget`, `/settings`; redirect chưa đăng nhập về `/auth`.  
- [ ] Xác thực email: ghi rõ có bật Confirm email trong Supabase; nếu có thì thông báo "Vui lòng xác thực email" và xử lý link confirm.  
- [ ] DataService: init, load categories/wallets/budgets, seed nếu rỗng, CRUD cho từng entity, theme (dark, currency, primary).  
- [ ] Quy định xóa category: không cho xóa nếu còn transaction (hoặc gán về "Khác"); quy định balance wallet (manual vs computed).  
- [ ] Layout: toolbar + bottom nav, router-outlet, responsive.  
- [ ] Dashboard: chọn tháng, tab VND/USD/SGD, 3 cards, cảnh báo budget, 2 doughnut charts.  
- [ ] Income / Expense: filter từ-đến ngày + ví; form thêm/sửa; list + sửa/xóa.  
- [ ] Budget: chọn tháng; list danh mục chi + đặt/sửa budget; progress bar.  
- [ ] Chuyển ví (Transfer): phase 1 — ghi rõ hướng dẫn user tạo 2 giao dịch thủ công; phase 2 tùy chọn flow "Chuyển ví".  
- [ ] Settings: logout, dark mode, primary color, currency, CRUD ví, CRUD danh mục, export CSV/JSON, import JSON; quy định import (trùng id: ghi đè/bỏ qua; chế độ: replace vs merge).  
- [ ] UtilsService & FormatMoneyPipe.  
- [ ] Environment: Supabase url và anon key qua environment.ts (hoặc app.config).  
- [ ] PWA (service worker).  
- [ ] Toàn bộ text tiếng Việt.

---

*Tài liệu PRD này mô tả đầy đủ tính năng và kỹ thuật đã phát triển cho MoneyLuvr, dùng Angular 21, Signals, Angular Material và Supabase làm backend.*
