# Phase 1: Local Supabase & DB Migrations - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning
**Source:** Initial Discussion & Technical Spec

<domain>
## Phase Boundary

Phase 1 có nhiệm vụ thiết lập môi trường phát triển cục bộ với Supabase trên Docker, viết các script SQL migration khởi tạo các bảng cơ sở dữ liệu và xây dựng khung thư mục cho frontend React Vite sử dụng cấu trúc Clean Architecture chia theo từng Module độc lập.

</domain>

<decisions>
## Implementation Decisions

### 1. Thiết lập Supabase Cục bộ
- Khởi động các dịch vụ Supabase local qua Docker Compose hoặc sử dụng Supabase CLI.
- Đảm bảo có script/lệnh rõ ràng để lập trình viên bắt đầu dự án (`supabase start` hoặc khởi động container trực tiếp).
- Cổng giao diện Studio UI phải có thể truy cập được tại `http://localhost:54321`.

### 2. Thiết lập Schema DB bằng các SQL Migrations thô
- Viết file SQL migration thô để tạo các bảng sau:
- Bảng **`files`**:
  - `id` (UUID, khóa chính)
  - `name` (TEXT, tên file)
  - `size` (BIGINT, kích thước file)
  - `status` (TEXT: `pending`, `processing`, `completed`, `failed`)
  - `processed_rows` (INTEGER, số dòng đã xử lý)
  - `total_rows` (INTEGER, tổng số dòng)
  - `error_log` (TEXT, ghi chi tiết lỗi nếu thất bại)
  - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)
- Bảng **`excel_data_rows`**:
  - `id` (UUID, khóa chính)
  - `file_id` (UUID, khóa ngoại liên kết bảng `files` kèm ON DELETE CASCADE)
  - `row_index` (INTEGER, số thứ tự dòng trong sheet)
  - `content` (JSONB, dữ liệu text thô của dòng)
  - `created_at` (TIMESTAMP WITH TIME ZONE)
- Bảng **`excel_row_images`**:
  - `id` (UUID, khóa chính)
  - `row_id` (UUID, khóa ngoại liên kết bảng `excel_data_rows` kèm ON DELETE CASCADE)
  - `file_id` (UUID, khóa ngoại liên kết bảng `files` kèm ON DELETE CASCADE)
  - `storage_path` (TEXT, đường dẫn file trong storage)
  - `original_name` (TEXT, tên gốc ảnh)
  - `created_at` (TIMESTAMP WITH TIME ZONE)
- Bảng **`processing_logs`**:
  - `id` (UUID, khóa chính)
  - `file_id` (UUID, khóa ngoại liên kết bảng `files` kèm ON DELETE CASCADE)
  - `level` (TEXT: `info`, `warning`, `error`)
  - `message` (TEXT, thông điệp log)
  - `created_at` (TIMESTAMP WITH TIME ZONE)
- Thiết lập các Index tăng tốc:
  - GIN Index trên `excel_data_rows.content`
  - Index chuẩn trên `excel_data_rows.file_id`
  - Index chuẩn trên `excel_row_images.row_id`

### 3. Scaffold Module-Level Clean Architecture cho React
Mã nguồn React Vite được tổ chức độc lập theo từng thư mục Module riêng biệt bên trong `src/modules/`.
Mỗi Module sẽ tự chứa cấu trúc Clean Architecture của riêng nó:
- `src/modules/auth/`
  - `domain/`: Chứa entities và interfaces repository thuần túy (e.g. `User.ts`, `IAuthRepository.ts`).
  - `usecases/`: Chứa logic nghiệp vụ cốt lõi (e.g. `LoginUser.ts`, `LogoutUser.ts`).
  - `adapters/`: Hiện thực hóa repositories kết nối với Supabase client (e.g. `SupabaseAuthRepository.ts`).
  - `presentation/`: Chứa components, views, pages và React hooks (e.g. `LoginView.tsx`, `useAuth.ts`).
- `src/modules/excel-processor/`
  - `domain/`: Chứa entities (e.g. `ExcelFile.ts`, `ExcelRow.ts`) và interfaces (e.g. `IExcelRepository.ts`).
  - `usecases/`: Chứa logic xử lý tệp (e.g. `UploadExcel.ts`, `GetIngestedRows.ts`).
  - `adapters/`: Tích hợp Supabase client (e.g. `SupabaseExcelRepository.ts`).
  - `presentation/`: Dashboard quản lý, progress bar, data grid (e.g. `DashboardView.tsx`, `DataTableView.tsx`).

### 4. Claude's Discretion
- Định nghĩa các scripts khởi tạo nhanh khung thư mục cho lập trình viên dễ làm việc.
- Cân nhắc cấu hình cài đặt Vitest để chạy unit test cho các modules sớm.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md` — Ngữ cảnh và mục tiêu dự án
- `.planning/REQUIREMENTS.md` — Chi tiết danh sách yêu cầu hệ thống
- `.planning/ROADMAP.md` — Bản đồ các phase phát triển

</canonical_refs>

<specifics>
## Specific Ideas

- Sử dụng file Excel thực tế nặng 80MB trong `DataData/TỔNG HỢP HCS T5-2026 FINAL.xlsx` để chạy test thủ công và verify hệ thống ở các phase sau.
- Tự động tạo sẵn các Storage buckets (`excel-uploads`, `excel-images`) khi khởi chạy migrations DB cục bộ.

</specifics>

<deferred>
## Deferred Ideas

- Thiết lập chính sách bảo mật Row Level Security (RLS) và phân vai Admin/Guest -> Dời sang Phase 2.
- Upload chunking dung lượng lớn sử dụng TUS -> Dời sang Phase 3.
- Stream parsing sử dụng Deno Edge Functions -> Dời sang Phase 4.

</deferred>

---

*Phase: 01-local-supabase-db-migrations*
*Context gathered: 2026-05-20*
