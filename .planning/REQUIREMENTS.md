# Yêu cầu Hệ thống: Excel Uploader & Processor

**Defined:** 2026-05-20
**Core Value:** Tải lên và trích xuất dữ liệu Excel lớn (bao gồm text và ảnh đính kèm) một cách đáng tin cậy, không làm nghẽn UI trình duyệt, lưu trữ chính xác thông tin và thực thi phân quyền truy cập chặt chẽ (Admin có quyền ghi/sửa, Guest chỉ có quyền đọc).

## v1 Requirements

### 1. Môi trường & Kiến trúc (Infrastructure & Clean Architecture)

- [x] **INF-01**: Chạy cơ sở dữ liệu Supabase cục bộ với đầy đủ cấu hình qua Docker Compose (bao gồm Auth, Storage, Database PostgreSQL và Studio UI quản lý).
- [x] **INF-02**: Áp dụng các script SQL migration thô để khởi tạo cấu trúc bảng, mối quan hệ và dữ liệu ban đầu trên Postgres.
- [ ] **INF-03**: Cấu trúc thư mục frontend React Vite + TSX theo mô hình Clean Architecture phân rã theo Module với các lớp tự chứa:
  - `src/modules/auth/{domain, usecases, adapters, presentation}`
  - `src/modules/excel-processor/{domain, usecases, adapters, presentation}`

### 2. Xác thực & Phân quyền (RBAC via DB RLS)

- [ ] **AUTH-01**: Người dùng đăng nhập hệ thống qua Supabase Auth bằng hai vai trò được thiết lập sẵn: Admin và Guest.
- [ ] **AUTH-02**: Triển khai các chính sách Row Level Security (RLS) trên PostgreSQL:
  - Admin: Toàn quyền truy cập (SELECT, INSERT, UPDATE, DELETE).
  - Guest: Chỉ được đọc dữ liệu (SELECT).
- [ ] **AUTH-03**: Ẩn các thao tác ghi dữ liệu (nút Thêm, Sửa, Xóa) trên giao diện React đối với tài khoản có vai trò Guest.

### 3. Tải lên tệp & Xử lý (Large Excel Ingestion & Tracking)

- [ ] **UPL-01**: Hỗ trợ tải lên file Excel cực lớn (100MB - 200MB) bằng cơ chế Resumable Upload (TUS / signed URLs) giúp giữ kết nối ổn định.
- [ ] **UPL-02**: Lưu trạng thái tải lên và xử lý tệp trong database (bảng `files` chứa trạng thái: `pending`, `processing`, `completed`, `failed`) để cập nhật tiến độ real-time cho người dùng.
- [ ] **PRC-01**: Parse file Excel bất đồng bộ phía server sử dụng Deno Edge Function với cơ chế đọc stream (Stream Reader) nhằm tiết kiệm RAM tối đa (dưới 150MB).
- [ ] **PRC-02**: Trích xuất các tệp hình ảnh nhúng (drawings/embedded images) trong Excel, tải lên bucket `excel-images` của Supabase Storage và lấy link public.
- [ ] **PRC-03**: Thực hiện bulk insert/upsert dữ liệu text vào Postgres theo từng lô (1,000 - 5,000 dòng mỗi đợt) để ngăn chặn lỗi timeout.
- [ ] **PRC-04**: Liên kết chính xác URL của ảnh trích xuất với dòng dữ liệu tương ứng trong Postgres thông qua bảng quan hệ phụ `excel_row_images`.

### 4. Giao diện Người dùng (React Vite Frontend UI/UX)

- [ ] **UI-01**: Màn hình dashboard hỗ trợ kéo thả file, hiển thị thanh tiến trình (progress bar) chi tiết trong suốt quá trình upload và xử lý.
- [ ] **UI-02**: Bảng hiển thị dữ liệu đã ingest hỗ trợ phân trang (pagination), sắp xếp (sorting), tìm kiếm và bộ lọc động trên server-side để tải dữ liệu lớn mượt mà.
- [ ] **UI-03**: Màn hình xem chi tiết dòng dữ liệu, hiển thị hình ảnh đính kèm đã trích xuất từ Excel, cho phép Admin chỉnh sửa form và khóa quyền ghi với Guest.
- [ ] **UI-04**: Bảng hiển thị log chi tiết lỗi khi quá trình xử lý tệp Excel thất bại để Admin dễ dàng debug.

## v2 Requirements

- **ADV-01**: Cho phép map cột tùy biến (custom column mapping) giữa tệp Excel và các bảng trong Database.
- **ADV-02**: Hỗ trợ chạy thử (dry-run) để kiểm tra lỗi dữ liệu Excel trước khi ghi thực tế vào Database.
- **ADV-03**: Cơ chế hoàn tác (rollback) toàn bộ đợt import nếu xảy ra lỗi ở giữa chu kỳ xử lý để đảm bảo tính nhất quán.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Chỉnh sửa Excel online kiểu Google Sheets | Quá phức tạp, không nằm trong mục tiêu cốt lõi của ứng dụng. |
| Xuất tệp Excel phức tạp phục hồi layout cũ | Ưu tiên dữ liệu ingest và trích xuất. Xuất file chỉ cần CSV cơ bản. |
| Đăng nhập bằng bên thứ ba OAuth | Email/password cục bộ là đủ để phát triển và kiểm thử. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INF-01 | Phase 1: Local Supabase & DB Migrations | Complete |
| INF-02 | Phase 1: Local Supabase & DB Migrations | Complete |
| INF-03 | Phase 1: Local Supabase & DB Migrations | Pending |
| AUTH-01 | Phase 2: Auth and RLS Configuration | Pending |
| AUTH-02 | Phase 2: Auth and RLS Configuration | Pending |
| AUTH-03 | Phase 2: Auth and RLS Configuration | Pending |
| UPL-01 | Phase 3: Chunked Upload & Tracking | Pending |
| UPL-02 | Phase 3: Chunked Upload & Tracking | Pending |
| PRC-01 | Phase 4: Async Deno Stream Parser & Ingestion | Pending |
| PRC-02 | Phase 4: Async Deno Stream Parser & Ingestion | Pending |
| PRC-03 | Phase 4: Async Deno Stream Parser & Ingestion | Pending |
| PRC-04 | Phase 4: Async Deno Stream Parser & Ingestion | Pending |
| UI-01 | Phase 5: Dashboard and Data Management | Pending |
| UI-02 | Phase 5: Dashboard and Data Management | Pending |
| UI-03 | Phase 5: Dashboard and Data Management | Pending |
| UI-04 | Phase 5: Dashboard and Data Management | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20*
