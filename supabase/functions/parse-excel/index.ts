import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { parseExcelAndIngest } from "./parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Xử lý CORS Preflight Request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Thiếu cấu hình biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
    }

    const { fileId } = await req.json();
    if (!fileId) {
      return new Response(
        JSON.stringify({ error: "Tham số 'fileId' là bắt buộc." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Kiểm tra xem file record có tồn tại không
    const { data: fileRecord, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fileError || !fileRecord) {
      return new Response(
        JSON.stringify({ error: `Không tìm thấy thông tin tệp tin có ID: ${fileId}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Tải tệp từ Storage về ổ đĩa tạm cục bộ của Edge Function
    const storagePath = `${fileId}/file.xlsx`;
    console.log(`[Edge Function] Đang tải tệp ${storagePath} từ storage bucket...`);

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("excel-uploads")
      .download(storagePath);

    if (downloadError || !fileBlob) {
      throw new Error(`Lỗi tải xuống tệp tin gốc từ Storage: ${downloadError?.message || 'Không nhận được dữ liệu'}`);
    }

    const tempFilePath = `/tmp/excel_${fileId}.xlsx`;
    const arrayBuffer = await fileBlob.arrayBuffer();
    await Deno.writeFileSync(tempFilePath, new Uint8Array(arrayBuffer));
    console.log(`[Edge Function] Đã ghi tệp tạm thành công ra đĩa: ${tempFilePath}`);

    // 3. Khởi chạy tiến trình parse Excel ngầm bất đồng bộ (Background Job)
    // Deno runtime cho phép Edge Function tiếp tục thực thi ngầm sau khi trả về response nếu dùng event loop
    (async () => {
      try {
        await parseExcelAndIngest({
          fileId,
          filePath: tempFilePath,
          supabaseUrl,
          supabaseServiceKey,
        });
      } catch (err: any) {
        console.error(`[Edge Function Background] Xử lý tệp ${fileId} thất bại:`, err);
      }
    })();

    // Trả về mã HTTP 202 Accepted thông báo đã nhận xử lý và đang chạy ngầm
    return new Response(
      JSON.stringify({
        message: "Yêu cầu xử lý tệp Excel đã được tiếp nhận thành công.",
        fileId,
        status: "processing",
      }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error(`[Edge Function Error]`, err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Lỗi xử lý server nội bộ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
