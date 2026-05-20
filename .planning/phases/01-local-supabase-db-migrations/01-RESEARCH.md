# Phase 1: Local Supabase & DB Migrations - Nghiên cứu Kỹ thuật

## 1. Hạ tầng Supabase Cục bộ qua Docker

Để phát triển dự án cục bộ an toàn và nhanh chóng, có hai phương án chính để khởi chạy Supabase:
- **Sử dụng Supabase CLI (Khuyên dùng)**: CLI sẽ quản lý các Docker containers của Supabase một cách tự động, hỗ trợ chạy migration DB, tự động theo dõi diff và gen TypeScript types cực chuẩn.
- **Sử dụng Docker Compose tùy biến**: Chạy trực tiếp Postgres, Studio, Kong, GoTrue và Storage thông qua file `docker-compose.yml` tự định nghĩa.

### Quyết định lựa chọn
Chúng ta sẽ cung cấp hướng dẫn và cấu hình dựa trên **Supabase CLI** chính thức vì nó hỗ trợ tốt nhất cho việc quản lý migrations, đồng bộ các config, và test cục bộ Deno Edge Functions sau này. Chúng ta cũng sẽ cung cấp file `docker-compose.yml` độc lập để dev khởi chạy nhanh nếu không có CLI.

---

## 2. Thiết kế Database Schema tối ưu (PostgreSQL)

Để xử lý tệp Excel siêu lớn (100MB - 200MB, tương ứng với hơn 100,000 dòng dữ liệu) chứa cả text thô và các tệp hình ảnh nhúng (drawings):
- **Bulk Insert (Xử lý theo lô)**: Ingest dữ liệu bắt buộc phải chia nhỏ thành các batch (từ 1,000 đến 5,000 dòng mỗi đợt) để ngăn chặn lỗi quá tải kết nối và timeout của Postgres.
- **Cấu trúc Dữ liệu Động**: Sử dụng cột kiểu `JSONB` tên là `content` trong bảng `excel_data_rows` để lưu trữ dữ liệu dạng key-value. Điều này giúp hệ thống tương thích với mọi cấu trúc cột của các tệp Excel khác nhau mà không cần chạy migration sửa schema bảng mỗi lần đổi file.
- **Chuẩn hóa Hình ảnh**: Thay vì lưu ảnh dạng base64 chuỗi dài trong JSONB (gây phình to kích thước DB và giảm hiệu năng truy vấn), chúng ta giải nén ảnh nhúng thành file, upload lên Supabase Storage và liên kết URL thông qua một bảng quan hệ phụ `excel_row_images`.

### Schema Cơ sở dữ liệu:
- `files`: Quản lý đợt import Excel, lưu thông tin kích thước, số dòng đã xử lý, tổng số dòng và log lỗi cụ thể.
- `excel_data_rows`: Lưu chi tiết các dòng Excel, liên kết với `files`. Dữ liệu lưu trong cột JSONB.
- `excel_row_images`: Liên kết 1-n giữa `excel_data_rows` và `files`. Chứa link storage của các ảnh trích xuất được.
- `processing_logs`: Lưu log kiểm tra tiến độ real-time khi server đang thực hiện import.

---

## 3. Cấu trúc Module-Level Clean Architecture cho Frontend React

Thay vì chia các thư mục Clean Architecture ở cấp thư mục gốc (làm phình to dự án và khó quản lý theo tính năng), chúng ta tổ chức mã nguồn độc lập theo từng thư mục Module riêng biệt nằm trong `src/modules/`. Điều này giúp các tính năng tự chứa (self-contained), dễ dàng phát triển song song và viết unit test.

### Sơ đồ cấu trúc một Module:
```
src/modules/
├── auth/
│   ├── domain/
│   │   ├── entities/          # Định nghĩa thực thể User
│   │   └── repositories/      # Định nghĩa interface (IAuthRepository)
│   ├── usecases/              # Logic đăng nhập/đăng xuất thuần túy
│   ├── adapters/              # Adapter kết nối với Supabase Auth
│   └── presentation/          # Views React, components, custom hooks
└── excel-processor/
    ├── domain/
    │   ├── entities/          # Thực thể ExcelFile, ExcelRow
    │   └── repositories/      # Định nghĩa interface (IExcelRepository)
    ├── usecases/              # Logic xử lý Excel (UploadExcel, GetIngestedRows)
    ├── adapters/              # Adapter kết nối với Supabase DB & Storage
    └── presentation/          # Components bảng biểu, hooks, dashboard uploader
```

---

## 4. Kiến trúc Xác thực & Nghiệm thu (Validation Architecture)

- **Postgres Assertions**: Viết các script SQL kiểm tra schema database đã được áp dụng đúng trên Postgres, kiểm tra đầy đủ các ràng buộc khóa ngoại và index (GIN index).
- **Kiểm tra tính độc lập của Module**: Thiết lập công cụ lint hoặc rà soát tĩnh (Static review) để đảm bảo các file trong `src/modules/*/domain/` không import bất kỳ framework ngoài nào (như React hay Supabase SDK).
