# Phase 1: Local Supabase & DB Migrations - Kế hoạch Kiểm thử & Nghiệm thu

**Phase:** 1
**Date:** 2026-05-20

## 1. Kiểm thử Môi trường Phát triển Cục bộ

### Kịch bản 1: Khởi động Supabase Cục bộ thành công
* **Phương pháp kiểm thử**: Khởi động stack dịch vụ local Supabase qua CLI hoặc Docker và rà soát trạng thái.
* **Các bước thực hiện**:
  1. Chạy lệnh khởi động: `supabase start` hoặc chạy docker compose.
  2. Rà soát trạng thái container: `docker ps`.
* **Kết quả kỳ vọng**:
  - Các container `supabase_db`, `supabase_auth`, `supabase_storage`, `supabase_kong` chạy bình thường và khỏe mạnh.
  - Studio UI truy cập tốt ở địa chỉ `http://localhost:54321`.

### Kịch bản 2: Áp dụng SQL Migrations thành công
* **Phương pháp kiểm thử**: Chạy script migration SQL thô và kiểm tra cấu trúc bảng trong PostgreSQL.
* **Các bước thực hiện**:
  1. Áp dụng migrations database: `supabase db reset` hoặc chạy lệnh migration tùy biến.
  2. Kết nối Postgres local qua Studio DB Editor hoặc TablePlus (port `54322`).
  3. Rà soát sự tồn tại của các bảng: `files`, `excel_data_rows`, `excel_row_images`, và `processing_logs`.
* **Kết quả kỳ vọng**:
  - Cả 4 bảng đều được tạo thành công trong schema `public`.
  - Các ràng buộc khóa ngoại (FK) với tùy chọn `ON DELETE CASCADE` được thiết lập chính xác.
  - Các chỉ mục tăng tốc (GIN index trên cột JSONB, b-tree index trên FKs) được tạo đầy đủ.

---

## 2. Kiểm thử Cấu trúc Mã nguồn

### Kịch bản 3: Kiểm tra tính độc lập của Module Clean Architecture
* **Phương pháp kiểm thử**: Rà soát tĩnh các lệnh `import` của tầng domain để đảm bảo tính độc lập.
* **Các bước thực hiện**:
  1. Mở các tệp trong `src/modules/*/domain/`.
  2. Mở các tệp trong `src/modules/*/usecases/`.
* **Kết quả kỳ vọng**:
  - Lớp domain tuyệt đối không import bất kỳ thư viện ngoài nào (React, Tailwind, hay `@supabase/supabase-js`).
  - Lớp usecase chỉ import từ domain, không phụ thuộc trực tiếp vào adapters hay views presentation.

### Kịch bản 4: Biên dịch và chạy thử ứng dụng React
* **Phương pháp kiểm thử**: Khởi động Vite dev server của React và kiểm tra giao diện.
* **Các bước thực hiện**:
  1. Chạy `npm install` trong thư mục frontend.
  2. Chạy lệnh dev: `npm run dev`.
  3. Truy cập vào `http://localhost:5173`.
* **Kết quả kỳ vọng**:
  - Dự án React build và compile thành công mà không có lỗi hay cảnh báo nghiêm trọng.
  - Trang chủ tải bình thường, không xuất hiện bất kỳ lỗi đỏ (JS error) nào trên Console của trình duyệt.
