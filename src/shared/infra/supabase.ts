import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!rawSupabaseUrl || !supabaseAnonKey) {
  throw new Error('Thiếu cấu hình VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY.');
}

let supabaseUrl = rawSupabaseUrl;

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  // Chỉ tự động đổi sang IP nội bộ khi URL đang dùng localhost (tức là cấu hình chạy local)
  if (
    rawSupabaseUrl.includes('localhost') ||
    rawSupabaseUrl.includes('127.0.0.1')
  ) {
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname) {
      supabaseUrl = `http://${hostname}:54321`;
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
