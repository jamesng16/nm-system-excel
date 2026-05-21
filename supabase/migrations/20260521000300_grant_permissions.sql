-- ==========================================
-- Cấp quyền sử dụng Schema public
-- ==========================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- ==========================================
-- Cấp quyền trên các bảng cho vai trò Authenticated (để RLS kiểm soát chi tiết sau)
-- ==========================================
GRANT ALL PRIVILEGES ON TABLE public.files TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.files TO service_role;
GRANT SELECT ON TABLE public.files TO anon;

GRANT ALL PRIVILEGES ON TABLE public.excel_data_rows TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.excel_data_rows TO service_role;
GRANT SELECT ON TABLE public.excel_data_rows TO anon;

GRANT ALL PRIVILEGES ON TABLE public.excel_row_images TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.excel_row_images TO service_role;
GRANT SELECT ON TABLE public.excel_row_images TO anon;

GRANT ALL PRIVILEGES ON TABLE public.processing_logs TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.processing_logs TO service_role;
GRANT SELECT ON TABLE public.processing_logs TO anon;

-- ==========================================
-- Cấp quyền mặc định cho các bảng được tạo trong tương lai (nếu có)
-- ==========================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
