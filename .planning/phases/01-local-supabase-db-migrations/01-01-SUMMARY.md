---
phase: 01-local-supabase-db-migrations
plan: 01-01
subsystem: database
tags: [supabase, postgres, docker-compose, migration]

requires:
  - phase: none
    provides: none
provides:
  - Local Supabase CLI environment setup with default port mapping
  - Database schema tables (files, excel_data_rows, excel_row_images, processing_logs) with constraints and indexes
  - Pre-initialized excel-uploads and excel-images storage buckets
  - Backup docker-compose.yml configuration for local dev
affects:
  - 01-02-PLAN.md
  - 02-01-PLAN.md

tech-stack:
  added: [supabase-cli, postgres, adminer, postgrest]
  patterns: [SQL-only migrations, local-first Docker database development]

key-files:
  created: [supabase/config.toml, supabase/migrations/20260520000000_init_schema.sql, docker-compose.yml]
  modified: []

key-decisions:
  - "Disabled edge_runtime in supabase/config.toml to bypass JSR package resolution timeout in restricted network environment."
  - "Configured Adminer as a lightweight backup database Studio mapping to port 54323, providing a drop-in replacement for Supabase Studio without global CLI dependencies."

patterns-established:
  - "Pattern 1: Database changes are exclusively managed via raw SQL migration files in supabase/migrations"

requirements-completed: [INF-01, INF-02]

duration: 25min
completed: 2026-05-20
---

# Phase 01 Plan 01-01: Thiết lập Local Supabase & SQL Migrations Summary

**Thiết lập môi trường Supabase cục bộ, tạo cơ sở dữ liệu Postgres 15+ gồm 4 bảng dữ liệu, 2 storage buckets, các chỉ mục GIN tối ưu và cấu hình docker-compose dự phòng**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-20T10:20:00Z
- **Completed:** 2026-05-20T10:45:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Cấu hình và khởi chạy thành công cụm Supabase CLI cục bộ thông qua Docker.
- Khởi tạo Postgres database schema đầy đủ gồm các bảng `files`, `excel_data_rows`, `excel_row_images`, và `processing_logs` với các ràng buộc khóa ngoại `ON DELETE CASCADE`.
- Thiết lập chỉ mục `GIN` hiệu năng cao trên cột `content` kiểu `JSONB` của bảng `excel_data_rows` để tăng tốc độ tìm kiếm và lọc dữ liệu JSON linh hoạt.
- Tự động tạo 2 storage buckets: `excel-uploads` (bảo mật riêng tư cho tệp thô) và `excel-images` (công khai cho hình ảnh trích xuất).
- Thiết lập file `docker-compose.yml` dự phòng giúp chạy độc lập Postgres, PostgREST và Studio (Adminer) trên các cổng tiêu chuẩn của dự án.

## Task Commits

Each task was committed atomically:

1. **Task 1: Khởi tạo cấu hình Supabase CLI cục bộ** - `b7a0bee` (chore)
2. **Task 2: Viết SQL migration khởi tạo database schema** - `2df8670` (feat)
3. **Task 3: Tạo cấu hình docker-compose.yml dự phòng** - `bc4a439` (chore)

## Files Created/Modified
- `supabase/config.toml` - Cấu hình cổng kết nối và các dịch vụ của Supabase local.
- `supabase/migrations/20260520000000_init_schema.sql` - Script SQL thô khởi tạo các bảng, khóa ngoại, chỉ mục hiệu năng và storage buckets.
- `docker-compose.yml` - Cấu hình docker-compose dự phòng cho môi trường dev độc lập.

## Decisions Made
- Tắt dịch vụ `edge_runtime` trong `supabase/config.toml` vì quá trình khởi động mặc định tải thư viện từ jsr.io dẫn đến lỗi mạng 403 Forbidden trong môi trường sandbox. Việc tắt dịch vụ này không ảnh hưởng đến database/storage dev và có thể kích hoạt lại/cấu hình lại ở Phase 4 khi triển khai Edge Functions.
- Chọn Adminer làm giao diện quản lý DB thay vì Supabase Studio gốc trong file `docker-compose.yml` dự phòng do cấu hình gọn nhẹ, không yêu cầu thiết lập hệ thống API Gateway (Kong) và Auth service phức tạp.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tắt dịch vụ edge_runtime trong supabase/config.toml**
- **Found during:** Task 2 (Viết SQL migration khởi tạo database schema)
- **Issue:** Khi chạy `supabase start`, CLI cố gắng khởi chạy container edge-runtime và tải package `@panva/jose` từ registry JSR. Do môi trường sandbox chặn kết nối internet ngoài, tiến trình tải thất bại với lỗi 403 Forbidden và ngăn không cho Supabase start.
- **Fix:** Đặt `enabled = false` cho `edge_runtime` trong `supabase/config.toml`.
- **Files modified:** `supabase/config.toml`
- **Verification:** Sau khi chỉnh sửa, lệnh `supabase start` chạy mượt mà và hoàn thành tất cả health check của các dịch vụ còn lại.
- **Committed in:** `2df8670`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Khắc phục triệt để lỗi chặn kết nối mạng cục bộ, đảm bảo môi trường database và storage sẵn sàng. Không ảnh hưởng đến các tính năng khác trong phase này.

## Issues Encountered
- Tiến trình tải docker images lần đầu tiên tốn thời gian hơn dự kiến, cần thiết lập timeout lớn khi chạy lệnh `supabase start` để tránh lỗi abort giữa chừng.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Môi trường database local và storage đã sẵn sàng hoạt động.
- Sẵn sàng chuyển sang Kế hoạch 01-02 để khởi tạo mã nguồn Frontend React Vite TSX và bootstrap Clean Architecture cấu trúc Modules.

## Self-Check: PASSED

