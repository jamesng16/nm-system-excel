-- Kích hoạt extension pgcrypto phục vụ hash mật khẩu nếu chưa có
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. Tạo các tài khoản Demo trực tiếp trong auth.users
-- Tài khoản Admin: admin@hcs.com (mật khẩu: admin123)
-- Tài khoản Guest: guest@hcs.com (mật khẩu: guest123)
-- ==========================================

-- Chèn tài khoản Admin
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new
)
VALUES (
    'a0e0a9f3-85f4-44aa-8b5e-04cf71317070', -- UUID tĩnh cho Admin
    '00000000-0000-0000-0000-000000000000',
    'admin@hcs.com',
    extensions.crypt('admin123', extensions.gen_salt('bf')),
    now(),
    '{"role": "admin"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Chèn tài khoản Guest
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new
)
VALUES (
    'b0e0b9f3-85f4-44aa-8b5e-04cf71317071', -- UUID tĩnh cho Guest
    '00000000-0000-0000-0000-000000000000',
    'guest@hcs.com',
    extensions.crypt('guest123', extensions.gen_salt('bf')),
    now(),
    '{"role": "guest"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Tương ứng chèn bản ghi vào auth.identities để đảm bảo liên kết đăng nhập email/password
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES (
    'a0e0a9f3-85f4-44aa-8b5e-04cf71317070',
    'a0e0a9f3-85f4-44aa-8b5e-04cf71317070',
    jsonb_build_object('sub', 'a0e0a9f3-85f4-44aa-8b5e-04cf71317070', 'email', 'admin@hcs.com'),
    'email',
    'a0e0a9f3-85f4-44aa-8b5e-04cf71317070',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES (
    'b0e0b9f3-85f4-44aa-8b5e-04cf71317071',
    'b0e0b9f3-85f4-44aa-8b5e-04cf71317071',
    jsonb_build_object('sub', 'b0e0b9f3-85f4-44aa-8b5e-04cf71317071', 'email', 'guest@hcs.com'),
    'email',
    'b0e0b9f3-85f4-44aa-8b5e-04cf71317071',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. Kích hoạt Row Level Security (RLS) cho các bảng
-- ==========================================
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_data_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_row_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. Tạo chính sách RLS cho Database
-- ==========================================

-- Bảng public.files
CREATE POLICY "Cho phép tất cả người dùng xem danh sách files" ON public.files
    FOR SELECT USING (true);

CREATE POLICY "Chỉ Admin mới có quyền ghi/sửa/xóa files" ON public.files
    FOR ALL TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Bảng public.excel_data_rows
CREATE POLICY "Cho phép tất cả người dùng xem chi tiết dữ liệu dòng" ON public.excel_data_rows
    FOR SELECT USING (true);

CREATE POLICY "Chỉ Admin mới có quyền ghi/sửa/xóa dữ liệu dòng" ON public.excel_data_rows
    FOR ALL TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Bảng public.excel_row_images
CREATE POLICY "Cho phép tất cả người dùng xem liên kết hình ảnh" ON public.excel_row_images
    FOR SELECT USING (true);

CREATE POLICY "Chỉ Admin mới có quyền ghi/sửa/xóa hình ảnh" ON public.excel_row_images
    FOR ALL TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Bảng public.processing_logs
CREATE POLICY "Cho phép tất cả người dùng xem log xử lý" ON public.processing_logs
    FOR SELECT USING (true);

CREATE POLICY "Chỉ Admin mới có quyền ghi log xử lý" ON public.processing_logs
    FOR ALL TO authenticated
    USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ==========================================
-- 4. Thiết lập chính sách bảo mật cho Storage Buckets
-- ==========================================

-- Cấu hình RLS trên bảng storage.objects

-- Bucket 'excel-uploads' (Private)
CREATE POLICY "Cho phép authenticated users đọc file Excel gốc" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'excel-uploads');

CREATE POLICY "Chỉ Admin mới được ghi/sửa/xóa file Excel gốc" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'excel-uploads' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    WITH CHECK (bucket_id = 'excel-uploads' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Bucket 'excel-images' (Public)
CREATE POLICY "Cho phép tất cả người dùng xem hình ảnh trích xuất" ON storage.objects
    FOR SELECT USING (bucket_id = 'excel-images');

CREATE POLICY "Chỉ Admin mới được tải lên/sửa/xóa hình ảnh trích xuất" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'excel-images' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    WITH CHECK (bucket_id = 'excel-images' AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
