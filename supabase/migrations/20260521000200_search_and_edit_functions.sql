-- 1. Create function to fetch paginated, filtered excel rows with their images
CREATE OR REPLACE FUNCTION public.get_excel_rows_paginated(
  p_file_id UUID,
  p_page_size INT,
  p_offset INT,
  p_search_term TEXT DEFAULT NULL,
  p_search_column TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  file_id UUID,
  row_index INT,
  content JSONB,
  images JSON,
  created_at TIMESTAMP WITH TIME ZONE,
  total_count BIGINT
) AS $$
#variable_conflict use_variable
DECLARE
  v_total_count BIGINT;
BEGIN
  -- Compute total count based on search filters
  IF p_search_term IS NULL OR p_search_term = '' THEN
    SELECT COUNT(*) INTO v_total_count
    FROM public.excel_data_rows
    WHERE file_id = p_file_id;
  ELSIF p_search_column IS NOT NULL AND p_search_column <> '' THEN
    SELECT COUNT(*) INTO v_total_count
    FROM public.excel_data_rows
    WHERE file_id = p_file_id
      AND (content->>p_search_column) ILIKE '%' || p_search_term || '%';
  ELSE
    SELECT COUNT(*) INTO v_total_count
    FROM public.excel_data_rows
    WHERE file_id = p_file_id
      AND content::text ILIKE '%' || p_search_term || '%';
  END IF;

  -- Return rows with JSON aggregated images
  IF p_search_term IS NULL OR p_search_term = '' THEN
    RETURN QUERY
    SELECT
      r.id,
      r.file_id,
      r.row_index,
      r.content,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', img.id,
              'row_id', img.row_id,
              'file_id', img.file_id,
              'storage_path', img.storage_path,
              'original_name', img.original_name,
              'created_at', img.created_at
            )
          )
          FROM public.excel_row_images img
          WHERE img.row_id = r.id
        ),
        '[]'::json
      ) AS images,
      r.created_at,
      v_total_count
    FROM public.excel_data_rows r
    WHERE r.file_id = p_file_id
    ORDER BY r.row_index ASC
    LIMIT p_page_size OFFSET p_offset;
  ELSIF p_search_column IS NOT NULL AND p_search_column <> '' THEN
    RETURN QUERY
    SELECT
      r.id,
      r.file_id,
      r.row_index,
      r.content,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', img.id,
              'row_id', img.row_id,
              'file_id', img.file_id,
              'storage_path', img.storage_path,
              'original_name', img.original_name,
              'created_at', img.created_at
            )
          )
          FROM public.excel_row_images img
          WHERE img.row_id = r.id
        ),
        '[]'::json
      ) AS images,
      r.created_at,
      v_total_count
    FROM public.excel_data_rows r
    WHERE r.file_id = p_file_id
      AND (r.content->>p_search_column) ILIKE '%' || p_search_term || '%'
    ORDER BY r.row_index ASC
    LIMIT p_page_size OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT
      r.id,
      r.file_id,
      r.row_index,
      r.content,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', img.id,
              'row_id', img.row_id,
              'file_id', img.file_id,
              'storage_path', img.storage_path,
              'original_name', img.original_name,
              'created_at', img.created_at
            )
          )
          FROM public.excel_row_images img
          WHERE img.row_id = r.id
        ),
        '[]'::json
      ) AS images,
      r.created_at,
      v_total_count
    FROM public.excel_data_rows r
    WHERE r.file_id = p_file_id
      AND r.content::text ILIKE '%' || p_search_term || '%'
    ORDER BY r.row_index ASC
    LIMIT p_page_size OFFSET p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
