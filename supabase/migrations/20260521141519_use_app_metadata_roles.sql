-- Chuyển vai trò phân quyền sang app_metadata vì user_metadata có thể bị người dùng sửa.
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  to_jsonb(raw_user_meta_data ->> 'role'),
  true
)
WHERE raw_user_meta_data ? 'role';

DROP POLICY IF EXISTS "Chỉ Admin mới có quyền ghi/sửa/xóa files" ON public.files;
DROP POLICY IF EXISTS "Chỉ Admin mới có quyền ghi/sửa/xóa dữ liệu dòng" ON public.excel_data_rows;
DROP POLICY IF EXISTS "Chỉ Admin mới có quyền ghi/sửa/xóa hình ảnh" ON public.excel_row_images;
DROP POLICY IF EXISTS "Chỉ Admin mới có quyền ghi log xử lý" ON public.processing_logs;
DROP POLICY IF EXISTS "Chỉ Admin mới được ghi/sửa/xóa file Excel gốc" ON storage.objects;
DROP POLICY IF EXISTS "Chỉ Admin mới được tải lên/sửa/xóa hình ảnh trích xuất" ON storage.objects;

CREATE POLICY "Chỉ Admin mới có quyền ghi/sửa/xóa files" ON public.files
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Chỉ Admin mới có quyền ghi/sửa/xóa dữ liệu dòng" ON public.excel_data_rows
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Chỉ Admin mới có quyền ghi/sửa/xóa hình ảnh" ON public.excel_row_images
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Chỉ Admin mới có quyền ghi log xử lý" ON public.processing_logs
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Chỉ Admin mới được ghi/sửa/xóa file Excel gốc" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'excel-uploads' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (bucket_id = 'excel-uploads' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Chỉ Admin mới được tải lên/sửa/xóa hình ảnh trích xuất" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'excel-images' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (bucket_id = 'excel-images' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

NOTIFY pgrst, 'reload schema';
