# Lotus Cinema

Ứng dụng quản lý rạp chiếu phim với Next.js và Supabase Database.

## Cấu hình

1. Chạy toàn bộ SQL trong `supabase/schema.sql` bằng Supabase SQL Editor.
	Script này tạo và seed các bảng `movies`, `rooms`, `showtimes` và `tickets`.
2. Tạo `.env.local` từ `.env.example`.
3. Điền URL project và **service-role secret key** vào `.env.local`. Không dùng publishable key cho `SUPABASE_SERVICE_ROLE_KEY`.
4. Chạy `npm run dev`.

## Tài khoản quản trị

Script `npm run reset-admin` sẽ tạo lại tài khoản admin trên Supabase. Chỉ chạy khi bạn chủ động muốn reset dữ liệu tài khoản và đã cấu hình key server.

## Các khu vực chính

- `/`: đăng nhập và đăng ký thành viên
- `/cap-2`: khu vực thành viên
- `/cinema`: quản trị phim, phòng, ghế, lịch chiếu, vé, khách hàng và doanh thu

Dữ liệu phim, phòng, lịch chiếu và vé được đọc/ghi qua `/api/cinema`, không còn chỉ nằm trong state của trình duyệt.

Ứng dụng hiện dùng custom session và password hash bằng Node crypto; không dùng Supabase Auth.
