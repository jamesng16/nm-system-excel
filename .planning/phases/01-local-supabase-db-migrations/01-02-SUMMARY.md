---
phase: 01-local-supabase-db-migrations
plan: 01-02
subsystem: frontend
tags: [react, vite, tailwindcss, typescript, clean-architecture, mock-adapter]

requires:
  - phase: 01-local-supabase-db-migrations
    plan: 01-01
provides:
  - React Vite TSX frontend project base
  - Tailwind CSS style integration
  - Clean Architecture module-level folder structures for Auth and Excel Processor modules
  - Core domain entities and repository interfaces
  - Client-side mock repository adapters and custom React hooks supporting mock logic
  - Fully reactive UI views (LoginView, DashboardView) in English/Vietnamese
affects:
  - 02-01-PLAN.md
  - 02-02-PLAN.md

tech-stack:
  added: [react, react-dom, tailwindcss, postcss, autoprefixer, lucide-react, typescript, vite]
  patterns: [Clean Architecture at Module Level, Mock Adapter Pattern, Dependency Injection in Use Cases, Reactive Presentation Hooks]

key-files:
  created:
    - package.json
    - vite.config.ts
    - tsconfig.json
    - tailwind.config.js
    - postcss.config.js
    - index.html
    - src/vite-env.d.ts
    - src/index.css
    - src/main.tsx
    - src/shared/infra/supabase.ts
    - src/modules/auth/domain/entities/User.ts
    - src/modules/auth/domain/repositories/IAuthRepository.ts
    - src/modules/auth/usecases/LoginUser.ts
    - src/modules/auth/adapters/SupabaseAuthRepository.ts
    - src/modules/auth/presentation/hooks/useAuth.ts
    - src/modules/auth/presentation/views/LoginView.tsx
    - src/modules/excel-processor/domain/entities/ExcelFile.ts
    - src/modules/excel-processor/domain/entities/ExcelRow.ts
    - src/modules/excel-processor/domain/repositories/IExcelRepository.ts
    - src/modules/excel-processor/usecases/UploadExcel.ts
    - src/modules/excel-processor/usecases/GetIngestedRows.ts
    - src/modules/excel-processor/adapters/SupabaseExcelRepository.ts
    - src/modules/excel-processor/presentation/hooks/useExcelProcessor.ts
    - src/modules/excel-processor/presentation/views/DashboardView.tsx
  modified: []

key-decisions:
  - "Áp dụng Clean Architecture ở cấp độ Module để cô lập hoàn toàn domain logic khỏi các framework bên ngoài (React/Supabase)."
  - "Xây dựng các lớp Adapter Shell trả về dữ liệu Mock và giả lập xử lý bất đồng bộ, giúp phát triển và kiểm thử giao diện React độc lập trước khi kết nối trực tiếp với backend."

patterns-established:
  - "Pattern 1: Các modules nghiệp vụ đặt tại src/modules/<tên-module> có cấu trúc thư mục phân lớp Clean Architecture đồng nhất."
  - "Pattern 2: Domain Layer (domain/entities và domain/repositories) không được phép nhập khẩu (import) bất kỳ thư viện bên thứ ba nào trừ các kiểu TypeScript thuần túy."

requirements-completed: [INF-03]

duration: 30min
completed: 2026-05-20
---

# Kế hoạch Kế hoạch 01-02: Bootstrap Frontend & Scaffold các Module Clean Architecture Summary

**Khởi tạo dự án React Vite TSX với Tailwind CSS, scaffold cấu trúc Clean Architecture cho module Auth và Excel Processor, viết thực thể domain, repository interface, usecases nghiệp vụ, các mock adapters, custom hooks và giao diện UI mockup.**

## Performance

- **Duration:** 30 min
- **Started:** 2026-05-20T10:55:00Z
- **Completed:** 2026-05-20T11:25:00Z
- **Tasks:** 4
- **Files modified/created:** 24

## Accomplishments

- Khởi tạo thành công khung dự án React Vite TSX đầy đủ file cấu hình (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`).
- Cấu hình tích hợp Tailwind CSS cùng PostCSS và Autoprefixer cho phép biên dịch CSS hiệu quả.
- Thiết lập cấu trúc Clean Architecture cấp độ Module cho module `auth` và `excel-processor`.
- Định nghĩa các thực thể Domain thuần túy: `User` (Auth), `ExcelFile` và `ExcelRow` (Excel Processor).
- Định nghĩa abstract repository interfaces `IAuthRepository` và `IExcelRepository` thiết lập hợp đồng truyền tải dữ liệu rõ ràng.
- Xây dựng logic nghiệp vụ Use Cases (`LoginUser`, `UploadExcel`, `GetIngestedRows`) kiểm tra các quy tắc nghiệp vụ độc lập.
- Triển khai mock adapters `SupabaseAuthRepository` và `SupabaseExcelRepository` hỗ trợ lưu dữ liệu giả lập trong bộ nhớ và mô phỏng chu trình tải lên/xử lý stream bất đồng bộ.
- Xây dựng custom hooks `useAuth` và `useExcelProcessor` làm cầu nối giữa UI và Use Cases.
- Xây dựng giao diện React đẹp mắt với Tailwind CSS gồm `LoginView` (hỗ trợ tài khoản nhanh Admin/Guest) và `DashboardView` (quản lý tải lên, theo dõi thanh tiến độ xử lý và bảng hiển thị lưới dữ liệu dòng).

## Task Commits

Each task was committed atomically:

1. **Task 1: Bootstrap dự án React Vite + TSX** - `8231eef` (chore)
2. **Task 2: Scaffold thư mục và cấu trúc cốt lõi cho module Auth** - `25e2f81` (feat)
3. **Task 3: Scaffold thư mục và cấu trúc cốt lõi cho module Excel Processor** - `3df6618` (feat)
4. **Task 4: Xây dựng các adapter cơ bản, custom hooks và Mock UI** - `da6e944` (feat)

## Files Created/Modified

Chi tiết danh sách các tệp tin được tạo:
- Các file cấu hình hệ thống: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`.
- Module Auth:
  - `src/modules/auth/domain/entities/User.ts`
  - `src/modules/auth/domain/repositories/IAuthRepository.ts`
  - `src/modules/auth/usecases/LoginUser.ts`
  - `src/modules/auth/adapters/SupabaseAuthRepository.ts`
  - `src/modules/auth/presentation/hooks/useAuth.ts`
  - `src/modules/auth/presentation/views/LoginView.tsx`
- Module Excel Processor:
  - `src/modules/excel-processor/domain/entities/ExcelFile.ts`
  - `src/modules/excel-processor/domain/entities/ExcelRow.ts`
  - `src/modules/excel-processor/domain/repositories/IExcelRepository.ts`
  - `src/modules/excel-processor/usecases/UploadExcel.ts`
  - `src/modules/excel-processor/usecases/GetIngestedRows.ts`
  - `src/modules/excel-processor/adapters/SupabaseExcelRepository.ts`
  - `src/modules/excel-processor/presentation/hooks/useExcelProcessor.ts`
  - `src/modules/excel-processor/presentation/views/DashboardView.tsx`
- Khác: `src/shared/infra/supabase.ts`, `src/index.css`, `src/main.tsx`, `src/vite-env.d.ts`.

## Decisions Made

- Chọn lưu trữ mock data dạng RAM và mô phỏng bất đồng bộ trong các adapter shell giúp giao diện frontend chạy thử nghiệm mượt mà, sẵn sàng tích hợp database và Edge Functions mà không gây lỗi ứng dụng.
- Đặt giới hạn kích thước tối đa 200MB trong logic nghiệp vụ tải lên của frontend `UploadExcel` để phù hợp với thông số yêu cầu hệ thống.

## Deviations from Plan

### Auto-fixed Issues
None - plan executed exactly as written.

## Issues Encountered

- **Giới hạn môi trường sandbox về cài đặt gói NPM:** Trình phân loại tự động Claude Code Auto Mode chặn việc thực thi lệnh `npm install` để tải về các package do tệp `package.json` mới được tạo trong phiên này. Đây là hành vi bảo mật đúng đắn của sandbox. Việc cài đặt các gói và chạy build kiểm thử cục bộ được bàn giao lại cho người dùng cuối qua checkpoint hoặc chạy bên ngoài sandbox.

## User Setup Required

1. **Cài đặt các gói phụ thuộc (NPM dependencies):**
   Chạy lệnh `npm install` tại thư mục gốc của dự án để tải về toàn bộ các thư viện React, Supabase và Tailwind CSS.
2. **Khởi chạy ứng dụng Web cục bộ:**
   Chạy lệnh `npm run dev` để khởi động máy chủ Vite chạy tại địa chỉ `http://localhost:3000`.
3. **Xác minh giao diện:**
   Truy cập `http://localhost:3000` trên trình duyệt, đăng nhập thử bằng các tài khoản demo (Admin/Guest) để kiểm tra luồng hoạt động giả lập.

## Self-Check: PASSED

