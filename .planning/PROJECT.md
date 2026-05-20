# Excel Uploader & Processor (Supabase + React + Tailwind)

## What This Is

Một hệ thống hiệu năng cao cho phép tải lên, theo dõi và xử lý các tệp Excel rất lớn (100MB - 200MB) chứa cả dữ liệu văn bản (text) và hình ảnh nhúng (embedded/blob images). Hệ thống tích hợp cơ chế parse dạng stream bất đồng bộ ở phía server (thông qua Supabase Deno Edge Functions), bulk-insert tối ưu vào PostgreSQL và trích xuất hình ảnh lưu trữ trên Supabase Storage. Frontend React (Vite + TSX + Tailwind CSS) được thiết kế theo cấu trúc Clean Architecture phân tách theo từng Module cụ thể, kết nối với môi trường phát triển Supabase cục bộ chạy trên Docker Compose.

## Core Value

Tải lên và trích xuất dữ liệu Excel lớn (bao gồm text và ảnh đính kèm) một cách đáng tin cậy, không làm nghẽn UI trình duyệt, lưu trữ chính xác thông tin và thực thi phân quyền truy cập chặt chẽ (Admin có quyền ghi/sửa, Guest chỉ có quyền đọc).

## Requirements

### Validated

*(Chưa có - Dự án mới khởi tạo)*

### Active

- [ ] **Tải lên file Excel lớn (100MB - 200MB)**: Hỗ trợ tải lên qua giao thức Resumable Upload (TUS / signed URLs của Supabase) để chống lỗi mạng chập chờn khi truyền file dung lượng lớn.
- [ ] **Xử lý Stream Ingestion bất đồng bộ phía Server**: Sử dụng Edge Function viết bằng Deno để parse file Excel dưới dạng stream tiết kiệm bộ nhớ (đảm bảo RAM sử dụng < 150MB trên Supabase Free Tier).
- [ ] **Trích xuất ảnh nhúng trong Excel**: Tự động trích xuất các file hình ảnh nhúng dưới dạng blob từ file Excel, upload lên Supabase Storage và liên kết đường dẫn lưu trữ vào Postgres.
- [ ] **Bulk Ingestion vào PostgreSQL**: Đưa dữ liệu text vào database theo lô (batch insert 1,000 - 5,000 dòng mỗi câu lệnh) để tối ưu tốc độ cho tệp trên 100,000 dòng, thiết lập GIN Index trên cột dữ liệu động JSONB.
- [ ] **Cơ chế phân quyền Role-Based Access Control (RBAC)**: Xác thực người dùng bằng Supabase Auth (cung cấp sẵn tài khoản Admin và Guest) và bảo mật dữ liệu bằng các chính sách Row Level Security (RLS) của Postgres.
- [ ] **Clean Architecture cấp độ Module**: Cấu trúc mã nguồn frontend phân tách độc lập theo từng tính năng (ví dụ: `src/modules/auth` và `src/modules/excel-processor`), mỗi module sở hữu các lớp riêng biệt: `domain`, `usecases`, `adapters`, `presentation`.
- [ ] **Môi trường phát triển cục bộ**: Thiết lập nhanh môi trường phát triển độc lập với Docker Compose chạy local Supabase, chạy khởi tạo database bằng các file SQL migrations thô.

### Out of Scope

- [ ] **Chỉnh sửa bảng tính trực tuyến giống Google Sheets**: Nằm ngoài nhu cầu cốt lõi. Giao diện chỉ hiển thị danh sách dòng dữ liệu và bảng log theo dõi.
- [ ] **Xuất dữ liệu Excel phức tạp giữ nguyên giao diện**: Chỉ hỗ trợ xuất dữ liệu thô dạng CSV đơn giản.

## Context

- Tệp Excel thực tế `TỔNG HỢP HCS T5-2026 FINAL.xlsx` nặng 80MB nằm trong thư mục `DataData/` được dùng làm file kiểm thử (UAT).
- Giới hạn tài nguyên: Supabase Edge Functions Free Tier giới hạn RAM ở mức 150MB. Load toàn bộ file Excel lớn vào bộ nhớ cùng lúc chắc chắn sẽ gây lỗi Out-Of-Memory (OOM).
- Cột `content` trong DB sử dụng JSONB giúp map linh hoạt dữ liệu động ra grid UI.

## Constraints

- **Kiến trúc**: Clean Architecture theo từng Module trên Frontend:
  - `src/modules/<tên-module>/domain/` (chứa entities và interfaces thuần túy, không phụ thuộc framework).
  - `src/modules/<tên-module>/usecases/` (chứa logic nghiệp vụ ứng dụng).
  - `src/modules/<tên-module>/adapters/` (kết nối Supabase SDK, repositories mạng).
  - `src/modules/<tên-module>/presentation/` (chứa React components, custom hooks, views).
- **Database Migrations**: Bắt buộc khởi tạo và cập nhật schema bằng các script SQL thô chạy cục bộ trên môi trường Docker.
- **Server Runtime**: Edge Functions phải chạy trên môi trường Deno.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clean Architecture theo Module | Tổ chức mã nguồn trực quan theo tính năng, giúp dễ quản lý khi phát triển song song các phần độc lập. | — Pending |
| SQL Database Schema Migrations | Chạy các script SQL thô trên database local giúp đồng bộ schema nhất quán và ổn định. | — Pending |
| Deno Streaming Parser | Đọc file Excel lớn dạng stream từng dòng để tránh tràn bộ nhớ RAM 150MB trên Server. | — Pending |

---
*Last updated: 2026-05-20 sau khi cập nhật ngôn ngữ*
