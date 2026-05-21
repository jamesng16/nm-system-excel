-- Cấp quyền gọi RPC phân trang dữ liệu Excel qua Supabase Data API
GRANT EXECUTE ON FUNCTION public.get_excel_rows_paginated(UUID, INT, INT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_excel_rows_paginated(UUID, INT, INT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_excel_rows_paginated(UUID, INT, INT, TEXT, TEXT) TO service_role;

-- Hàm này chỉ đọc dữ liệu nên để invoker để các quyền bảng/RLS hiện tại vẫn được áp dụng.
ALTER FUNCTION public.get_excel_rows_paginated(UUID, INT, INT, TEXT, TEXT) SECURITY INVOKER;

NOTIFY pgrst, 'reload schema';
