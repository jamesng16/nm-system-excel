# Phase 2: Auth and RLS Configuration - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase này tập trung hoàn toàn vào việc xây dựng hệ thống Xác thực (Auth) và phân quyền (RBAC - Role-Based Access Control) cho ứng dụng thông qua việc cấu hình local Supabase Auth, thiết lập Row Level Security (RLS) ở tầng database Postgres và ẩn hiện giao diện UI phù hợp trên client. Phạm vi bao gồm bảo vệ các trang dashboard/admin khỏi các truy cập trái phép của Guest và chỉ cho phép tài khoản Admin thực hiện các hành động ghi/sửa.

</domain>

<decisions>
## Implementation Decisions

### Session & Token Storage
- **D-01:** Sử dụng **LocalStorage (Mặc định của Supabase)** để duy trì phiên làm việc cho cả 2 vai trò người dùng (Admin và Guest). Quyết định này giúp giữ trạng thái phiên làm việc ổn định của Admin trong suốt quá trình tải lên và xử lý tệp Excel lớn (>100MB), hỗ trợ auto-refresh token ngầm mượt mà và tránh việc người dùng phải đăng nhập lại mỗi khi mở tab mới.

### Phân quyền & RLS Database
- **D-02:** Vai trò người dùng (role: `admin` hoặc `guest`) sẽ được lưu trực tiếp trong trường **Auth User Metadata** (`user_metadata` của Supabase Auth). RLS Policy sẽ đọc role trực tiếp từ token JWT thông qua hàm `auth.jwt() -> 'user_metadata' -> 'role'`. Lựa chọn này giúp RLS thực thi cực nhanh trên Postgres mà không cần JOIN thêm bảng `profiles`, tối ưu hóa hiệu năng tối đa cho môi trường phát triển cục bộ.

### Trải nghiệm người dùng Guest
- **D-03:** Đối với người dùng có vai trò Guest (chỉ đọc), hệ thống sẽ **ẩn hoàn toàn các nút thao tác nghiệp vụ có quyền ghi** như: "Tải lên file Excel", "Xoá", "Cập nhật dữ liệu" trên giao diện UI. Quyết định này giữ cho giao diện gọn gàng, tinh khiết và trực quan, giảm thiểu nhầm lẫn cho người dùng chỉ đọc.

### Xử lý Token hết hạn (Token Expiration)
- **D-04:** Khi mã xác thực (session token) hết hạn trong quá trình sử dụng, hệ thống sẽ **hiển thị một Popup/Modal yêu cầu đăng nhập lại tại chỗ** thay vì tự động chuyển hướng (redirect) về trang đăng nhập. Điều này giúp bảo toàn ngữ cảnh làm việc hiện tại của người dùng (ví dụ: khi đang xem dở log hoặc lưới dữ liệu lớn).

### Claude's Discretion
Không có quyết định nào bị trì hoãn hoặc hoàn toàn giao quyền quyết định cho Claude - tất cả các quyết định lớn về trải nghiệm và bảo mật của Phase 2 đã được định hình rõ ràng bởi người dùng.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Authentication Scope
- `.planning/PROJECT.md` — Định nghĩa core value và các yêu cầu active bao gồm phân quyền RBAC dựa trên RLS.
- `.planning/REQUIREMENTS.md` — Danh sách yêu cầu chi tiết về phân quyền bảo mật (AUTH-01, AUTH-02, AUTH-03).
- `.planning/ROADMAP.md` — Xác định mục tiêu thành công của Phase 2 và các kế hoạch (02-01, 02-02).

### Database Schema
- `supabase/migrations/20260520000000_init_schema.sql` — Chứa schema ban đầu của database cần được bảo mật bằng các chính sách RLS.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared/infra/supabase.ts` — Chứa supabase client đã được khởi tạo toàn cục dùng chung cho việc kết nối API Auth.
- `src/modules/auth/domain/entities/User.ts` — Định nghĩa thực thể `User` (id, email, role).
- `src/modules/auth/domain/repositories/IAuthRepository.ts` — Interface repo định nghĩa các phương thức `login`, `logout`, `getCurrentUser`.

### Established Patterns
- Clean Architecture cấp độ Module: Cấu trúc code của module `auth` đã được chia thành các tầng con tách biệt (`domain`, `usecases`, `adapters`, `presentation`).

### Integration Points
- `src/modules/auth/presentation/views/LoginView.tsx` — View đăng nhập thô cần được tích hợp logic của adapter Supabase thực tế.
- `src/modules/auth/adapters/SupabaseAuthRepository.ts` — Mock adapter cần được viết lại để sử dụng Supabase Auth client thực tế.
- `src/modules/excel-processor/presentation/views/DashboardView.tsx` — View bảng điều khiển hiển thị cần được tích hợp logic phân quyền UI để ẩn các nút ghi/sửa đối với người dùng Guest.

</code_context>

<specifics>
## Specific Ideas

Người dùng mong muốn có cơ chế đăng nhập lại mượt mà thông qua Popup/Modal khi token hết hạn để tránh mất dữ liệu lưới và log đang hiển thị.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Auth and RLS Configuration*
*Context gathered: 2026-05-21*
