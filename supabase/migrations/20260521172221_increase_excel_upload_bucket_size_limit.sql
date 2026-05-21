-- Tăng giới hạn dung lượng upload cho file Excel lớn.
UPDATE storage.buckets
SET
  file_size_limit = 209715200,
  allowed_mime_types = ARRAY[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
  ]
WHERE id = 'excel-uploads';
