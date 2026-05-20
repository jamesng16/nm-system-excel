# Phase 2: Auth and RLS Configuration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 2-Auth and RLS Configuration
**Areas discussed:** Session Storage, Vai trò người dùng (Role RLS), Giao diện Guest UI, Token Expiration

---

## Session Storage (Lưu trữ phiên)

| Option | Description | Selected |
|--------|-------------|----------|
| LocalStorage | Lưu trữ token trong localStorage, session duy trì vĩnh viễn và tự động refresh ngầm. | ✓ |
| SessionStorage | Lưu trữ token trong sessionStorage, tự động logout khi đóng tab/trình duyệt. | |

**User's choice:** LocalStorage (Mặc định của Supabase)
**Notes:** Quyết định sử dụng LocalStorage được đề xuất nhằm tối ưu hóa chu trình tải lên tệp lớn (>100MB) của Admin. Việc giữ phiên làm việc bền vững giúp tránh lỗi đứt đoạn khi Admin vô tình tải lại trang hoặc mở tab mới, đồng thời tích hợp mượt mà nhất với cơ chế auto-refresh token ngầm của Supabase JS SDK.

---

## Phân quyền & RLS Database (Role Storage)

| Option | Description | Selected |
|--------|-------------|----------|
| Auth User Metadata | Lưu role trong user_metadata của Supabase Auth. RLS policy đọc trực tiếp qua token JWT bằng auth.jwt(). | ✓ |
| Profiles Table (JOIN) | Tạo bảng profiles (id, role) JOIN qua auth.users. RLS JOIN để kiểm tra. | |

**User's choice:** Auth User Metadata
**Notes:** Lưu trực tiếp trong Auth User Metadata giúp chính sách bảo mật Row Level Security (RLS) của database Postgres cục bộ truy xuất và thực thi cực nhanh trên JWT mà không cần JOIN thêm bảng `profiles`, giúp tiết kiệm tài nguyên hệ thống và đẩy nhanh tốc độ phản hồi API.

---

## Trải nghiệm người dùng Guest (Guest UI)

| Option | Description | Selected |
|--------|-------------|----------|
| Ẩn hoàn toàn nút | Ẩn hoàn toàn các nút thao tác có quyền ghi (Upload Excel, Xóa, Cập nhật) đối với Guest. | ✓ |
| Hiển thị disabled + Tooltip | Giữ nguyên nút ở trạng thái disabled và hiển thị Tooltip yêu cầu quyền Admin. | |

**User's choice:** Ẩn hoàn toàn nút
**Notes:** Người dùng mong muốn giao diện của Guest (chỉ đọc) được tinh giản nhất có thể. Việc ẩn hoàn toàn các nút thao tác có quyền ghi giúp giao diện gọn gàng, sạch sẽ, không gây cảm giác phức tạp hoặc nhầm lẫn cho người dùng Guest.

---

## Token Expiration (Hết hạn token)

| Option | Description | Selected |
|--------|-------------|----------|
| Chuyển hướng tức thì | Tự động chuyển hướng ngay lập tức về màn hình Login khi hết hạn token. | |
| Hiển thị Popup re-login | Hiển thị một Popup/Modal yêu cầu đăng nhập lại ngay tại chỗ mà không chuyển trang. | ✓ |

**User's choice:** Hiển thị Popup re-login
**Notes:** Khi token hết hạn trong quá trình làm việc, Popup re-login sẽ được kích hoạt để người dùng đăng nhập lại ngay tại chỗ, giúp bảo toàn toàn bộ ngữ cảnh hiển thị dữ liệu lưới hoặc log xử lý đang thực thi ngầm trên trang hiện tại.

---

## Claude's Discretion

Không có chủ đề nào bị trì hoãn hoặc giao quyền tự quyết hoàn toàn cho Claude. Tất cả các hướng đi chiến lược cốt lõi của Phase 2 về bảo mật và trải nghiệm UI/UX đều đã được chốt và định nghĩa rõ ràng.

## Deferred Ideas

None — discussion stayed within phase scope.
