# NM System - Excel Uploader & Processor

Dự án xử lý file Excel lớn tích hợp Supabase local và React frontend Clean Architecture.

## Build & Test Commands

- Khởi động môi trường phát triển: `npm run dev`
- Build dự án: `npm run build`
- Chạy linter: `npm run lint`
- Khởi chạy môi trường local Supabase: `supabase start`
- Dừng môi trường local Supabase: `supabase stop`
- Thực hiện migrations: `supabase migration up` (hoặc chạy các file migrations thô trong `supabase/migrations/`)

## Quy định phát triển (Development Guidelines)

- **Kiến trúc**: Tuân thủ Clean Architecture theo từng Module tại Frontend (`src/modules/<module-name>/{domain,usecases,adapters,presentation}`).
- **Mã nguồn**: Tối giản hóa code, không thêm các tính năng giả định, viết code an toàn bảo mật tránh OWASP Top 10.
- **Database**: Bắt buộc khởi tạo và cập nhật schema bằng các file SQL migrations thô chạy local trên Docker.
- **Phân quyền & RLS**:
  - Đọc vai trò người dùng (`admin` / `guest`) trực tiếp từ JWT metadata bằng `auth.jwt() -> 'user_metadata' -> 'role'`.
  - Admin có quyền ghi/sửa (Upload Excel, Update, Delete). Guest chỉ có quyền đọc (Read-only).
  - Ẩn hoàn toàn các nút ghi/sửa trên UI đối với vai trò Guest.

## ⚠️ QUY TẮC BẮT BUỘC: QUẢN LÝ NGỮ CẢNH (CONTEXT GUARD - ƯU TIÊN HÀNG ĐẦU)

Khi kích thước ngữ cảnh (context size) đạt ngưỡng **80%** (used_percentage >= 80%):
- **Hành động bắt buộc**: Agent **PHẢI DỪNG NGAY LẬP TỨC** mọi hành động viết code, nghiên cứu hoặc gọi công cụ.
- **Phản hồi người dùng**: Agent **PHẢI** xuất ra thông báo cảnh báo cực kỳ nổi bật, giải thích rằng context đã đạt ngưỡng giới hạn 80%, và **BẮT BUỘC YÊU CẦU người dùng chạy lệnh `/compact`** trong CLI trước khi tiếp tục.
- **Cách kiểm tra**: Agent có thể kiểm tra trực tiếp phần trăm sử dụng hiện tại trong tệp tin cache `.omc/state/hud-stdin-cache.json` ở mục `context_window` -> `used_percentage`.

Hãy luôn ghi nhớ quy tắc này để bảo vệ sự an toàn và hiệu năng của phiên làm việc!
