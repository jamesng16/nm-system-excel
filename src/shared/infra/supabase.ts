import { createClient } from '@supabase/supabase-js';

// Xác định URL của API Supabase động dựa trên domain hiện tại của trình duyệt
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname) {
    // Nếu truy cập bằng IP mạng, tự động đổi URL API sang IP tương ứng
    supabaseUrl = `http://${hostname}:54321`;
  }
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
