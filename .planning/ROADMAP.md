# Roadmap: Excel Uploader & Processor

## Overview

Bản lộ trình phát triển của dự án Excel Uploader & Processor. Hệ thống sử dụng một local backend chạy Supabase trên Docker, client React (Vite + TSX + Tailwind CSS) được cấu trúc Clean Architecture theo từng module, parser stream viết bằng Deno Edge Function để xử lý file 100MB-200MB, và database migrations chạy bằng script SQL thô. Dự án được chia thành 5 phase phát triển bài bản.

## Phases

- [x] **Phase 1: Local Supabase & DB Migrations** - Khởi động local Supabase Docker, cấu hình API/DB ports, chạy SQL migrations và bootstrap bộ khung module-level Clean Architecture cho React. (completed 2026-05-20)
- [ ] **Phase 2: Auth and RLS Configuration** - Thiết lập đăng nhập, quản lý vai trò Admin/Guest, viết các quy định Row Level Security (RLS) bảo mật dữ liệu ở tầng database và ẩn giao diện ghi sửa đối với Guest.
- [ ] **Phase 3: Chunked Upload & Tracking** - Xây dựng giao diện upload file lớn không bị timeout trên Client, đồng bộ trạng thái tệp Ingestion trong database.
- [ ] **Phase 4: Async Deno Stream Parser & Ingestion** - Phát triển parser stream trên Deno Edge Function để parse file lớn tiết kiệm RAM, trích xuất ảnh nhúng lưu lên storage, bulk insert dữ liệu vào Postgres.
- [ ] **Phase 5: Dashboard and Data Management** - Hoàn thiện UI grid dữ liệu (phân trang, search, lọc), form chi tiết cho phép xem ảnh và sửa text cho Admin, log error viewer.

---

## Phase Details

### Phase 1: Local Supabase & DB Migrations
**Goal**: Xây dựng môi trường phát triển cục bộ hoàn chỉnh với Supabase thông qua Docker, chạy khởi tạo database schema bằng các script SQL migration thô, và thiết lập cấu trúc mã nguồn modules cho React.
**Depends on**: Nothing (first phase)
**Requirements**: INF-01, INF-02, INF-03
**Success Criteria**:
  1. Các dịch vụ Supabase local khởi chạy thành công (`supabase start` hoặc qua docker compose).
  2. SQL migration scripts chạy thành công, tạo các bảng `files`, `excel_data_rows`, `excel_row_images`, và `processing_logs` với các ràng buộc khóa ngoại.
  3. Scaffold frontend React tạo thành công các modules (`src/modules/auth` và `src/modules/excel-processor`) với đầy đủ các tầng con: `domain`, `usecases`, `adapters`, `presentation`.
**Plans**: 2 plans

Plans:
- [x] 01-01: Thiết lập cấu hình local Supabase Docker và viết SQL migration khởi tạo database schema.
- [x] 01-02: Bootstrap Frontend React Vite TSX, tích hợp Tailwind CSS và tạo khung thư mục module-level Clean Architecture.

### Phase 2: Auth and RLS Configuration
**Goal**: Tích hợp xác thực người dùng và phân quyền truy cập thông qua Postgres RLS và logic client React.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria**:
  1. Người dùng đăng nhập được bằng tài khoản Admin (`admin@system.com`) hoặc Guest (`guest@system.com`).
  2. Database tự động chặn các câu lệnh INSERT/UPDATE/DELETE từ Guest (lỗi DB RLS).
  3. Giao diện presentation React ẩn các nút edit/delete khi người dùng đăng nhập là Guest.
**Plans**: 2 plans

Plans:
- [ ] 02-01: Cấu hình Supabase Auth cục bộ, thiết lập các role và viết các chính sách Postgres RLS.
- [ ] 02-02: Hoàn thiện module Auth (`src/modules/auth`) và bảo vệ các routes trên frontend.

### Phase 3: Chunked Upload & Tracking
**Goal**: Hỗ trợ upload file Excel dung lượng lớn (100MB-200MB) bằng cơ chế resumable chunked upload và ghi nhận trạng thái files trong DB.
**Depends on**: Phase 2
**Requirements**: UPL-01, UPL-02
**Success Criteria**:
  1. Frontend upload thành công file Excel nặng > 100MB lên Storage mà không bị đứt quãng hay timeout.
  2. Database lưu trạng thái file là `pending` ban đầu và cập nhật `processing` khi server bắt đầu xử lý.
**Plans**: 2 plans

Plans:
- [ ] 03-01: Cấu hình Storage bucket (`excel-uploads`) trên Supabase với phân quyền chỉ Admin được ghi.
- [ ] 03-02: Phát triển adapter upload chunked resumable sử dụng TUS hoặc signed URLs trong module `excel-processor`.

### Phase 4: Async Deno Stream Parser & Ingestion
**Goal**: Xây dựng Edge Function (Deno) parse Excel lớn bằng Stream, trích xuất ảnh nhúng lưu lên storage và bulk insert dữ liệu văn bản vào DB Postgres.
**Depends on**: Phase 3
**Requirements**: PRC-01, PRC-02, PRC-03, PRC-04
**Success Criteria**:
  1. Parse file Excel 100MB+ bất đồng bộ trên Deno Edge Function với bộ nhớ RAM tiêu thụ luôn < 150MB.
  2. Các tệp hình ảnh nhúng được giải nén/trích xuất thô thành công, lưu lên bucket `excel-images` và lấy link public.
  3. Dữ liệu text dòng được bulk insert theo lô (chunks 2000 dòng) cực nhanh vào Postgres.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Viết Deno Edge Function parse Excel stream sử dụng các thư viện stream tối ưu.
- [ ] 04-02: Viết logic giải nén ảnh nhúng, upload lên Storage và liên kết URL ảnh với dòng dữ liệu text tương ứng qua bảng quan hệ phụ.

### Phase 5: Dashboard and Data Management
**Goal**: Thiết kế màn hình dashboard, grid dữ liệu lớn (phân trang, search, lọc) và panel cập nhật thông tin cho Admin trên frontend.
**Depends on**: Phase 4
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria**:
  1. Dashboard hiển thị thanh tiến trình xử lý thời gian thực qua Realtime DB subscription.
  2. Grid dữ liệu hiển thị mượt mà hàng chục nghìn dòng, hỗ trợ phân trang và tìm kiếm nhanh.
  3. Giao diện xem chi tiết hiển thị đầy đủ văn bản và ảnh trích xuất, chỉ Admin có quyền sửa đổi và lưu thành công.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Phát triển dashboard theo dõi tiến trình upload, parsing và màn hình log lỗi Ingestion.
- [ ] 05-02: Phát triển grid dữ liệu hiệu năng cao (pagination, column search) và form cập nhật chi tiết.

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Local Supabase & DB Migrations | 2/2 | Complete   | 2026-05-20 |
| 2. Auth and RLS Configuration | 0/2 | Not started | - |
| 3. Chunked Upload & Tracking | 0/2 | Not started | - |
| 4. Async Deno Stream Parser & Ingestion | 0/2 | Not started | - |
| 5. Dashboard and Data Management | 0/2 | Not started | - |

---
*Roadmap defined: 2026-05-20*
*Last updated: 2026-05-20*
