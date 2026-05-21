-- Đảm bảo tài khoản demo trên Cloud có role trong app_metadata để RLS dùng ổn định.
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb,
  true
)
WHERE email = 'admin@hcs.com';

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"guest"'::jsonb,
  true
)
WHERE email = 'guest@hcs.com';

NOTIFY pgrst, 'reload schema';
