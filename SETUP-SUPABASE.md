# Hướng dẫn setup Supabase cho MoneyLuvr (step by step)

Bạn đã cấu hình `environment` với Supabase URL và anon key. Làm lần lượt các bước dưới.

---

## Bước 1: Mở Supabase Dashboard

1. Vào [https://supabase.com/dashboard](https://supabase.com/dashboard) và đăng nhập.
2. Chọn project của bạn (project có URL `https://qugibmbrwskzjnbgnalm.supabase.co`).

---

## Bước 2: Chạy SQL tạo bảng và RLS

1. Trong menu trái, chọn **SQL Editor**.
2. Chọn **New query**.
3. Mở file `supabase-schema.sql` trong repo (ở thư mục gốc dự án), copy **toàn bộ** nội dung.
4. Dán vào ô soạn thảo trong SQL Editor.
5. Bấm **Run** (hoặc Ctrl/Cmd + Enter).
6. Kiểm tra: nếu chạy thành công, sẽ thấy thông báo dạng "Success. No rows returned".

Nếu báo lỗi đã tồn tại (ví dụ table already exists), có thể bỏ qua hoặc xóa bảng cũ rồi chạy lại (chỉ khi bạn chưa có dữ liệu cần giữ).

---

## Bước 3: Bật Auth (Email/Password)

1. Trong menu trái chọn **Authentication** → **Providers**.
2. Đảm bảo **Email** được bật.
3. (Tùy chọn) Trong **Authentication** → **Email Templates** bạn có thể chỉnh nội dung email xác thực / đặt lại mật khẩu.
4. Nếu muốn bắt user xác thực email sau khi đăng ký: **Authentication** → **Providers** → **Email** → bật **Confirm email**. App đã hỗ trợ thông báo "Vui lòng xác thực email".

---

## Bước 4: Chạy app và đăng ký user

1. Trong terminal, tại thư mục dự án chạy:
   ```bash
   ng serve
   ```
2. Mở trình duyệt: [http://localhost:4200](http://localhost:4200).
3. App sẽ chuyển đến `/auth` (màn hình đăng nhập/đăng ký).
4. Chọn tab **Đăng ký**, nhập email và mật khẩu (tối thiểu 6 ký tự), bấm **Đăng ký**.
5. Sau khi đăng ký thành công, app chuyển về Tổng quan. Lần đầu vào, app sẽ tự **seed** danh mục và ví mặc định (Ăn uống, Lương, Tiền mặt, Ngân hàng, Ví điện tử, …).

---

## Bước 5: Kiểm tra dữ liệu trên Supabase

1. Trong Supabase: **Table Editor**.
2. Kiểm tra các bảng:
   - **categories**: có nhiều dòng (danh mục thu + chi mặc định).
   - **wallets**: có 3 dòng (Tiền mặt, Ngân hàng, Ví điện tử).
3. **transactions** và **budgets** có thể trống cho đến khi bạn thêm giao dịch / đặt ngân sách trong app.

---

## Lỗi thường gặp

| Triển khai | Cách xử lý |
|------------|------------|
| "Supabase URL và anon key chưa được cấu hình" | Kiểm tra `src/environments/environment.development.ts` (khi chạy `ng serve`) và `environment.ts` (khi build production) đã có `url` và `anonKey` đúng. |
| "new row violates row-level security" | Đảm bảo đã chạy xong `supabase-schema.sql` (RLS policies đã tạo). User phải đăng nhập; mọi insert/update phải có `user_id = auth.uid()`. |
| Bảng không tồn tại | Chạy lại toàn bộ script trong `supabase-schema.sql` trong SQL Editor. |
| Đăng ký báo lỗi | Xem **Authentication** → **Users** trên Supabase; nếu cần tắt "Confirm email" để test nhanh. |

Sau khi xong các bước trên, bạn có thể dùng app bình thường: thêm thu nhập, chi tiêu, đặt ngân sách, xem tổng quan.
