import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Fetch configurations from supabase cli status
import { execSync } from "child_process";

console.log("Đang lấy thông tin Supabase local...");
const statusJsonStr = execSync("npx supabase status -o json").toString();
const config = JSON.parse(statusJsonStr);

const supabaseUrl = config.API_URL;
const supabaseServiceKey = config.SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
  const filePath = "Data/TỔNG HỢP HCS T5-2026 FINAL.xlsx";
  if (!fs.existsSync(filePath)) {
    console.error(`Không tìm thấy file test tại ${filePath}`);
    return;
  }

  const fileName = path.basename(filePath);
  const fileStats = fs.statSync(filePath);
  const fileSize = fileStats.size;

  console.log(`Đang chuẩn bị kiểm thử tệp: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

  // 1. Tạo file record
  console.log("1. Đang tạo file record trong database...");
  const { data: dbFile, error: insertError } = await supabase
    .from("files")
    .insert({
      name: fileName,
      size: fileSize,
      status: "pending",
      processed_rows: 0,
      total_rows: 0,
    })
    .select()
    .single();

  if (insertError || !dbFile) {
    console.error("Lỗi khởi tạo record:", insertError);
    return;
  }

  const fileId = dbFile.id;
  console.log(`Đã tạo file record thành công. ID: ${fileId}`);

  try {
    // 2. Upload file lên storage
    console.log("2. Đang tải file lên storage bucket 'excel-uploads'...");
    const fileBuffer = fs.readFileSync(filePath);
    const sanitizedName = fileName.normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${fileId}/${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from("excel-uploads")
      .upload(storagePath, fileBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }
    console.log("Tải file lên storage thành công!");

    // 3. Kích hoạt parse-excel microservice
    console.log("3. Đang gửi yêu cầu kích hoạt parse-excel...");
    const startTime = Date.now();
    const response = await fetch("http://localhost:54330", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileId }),
    });

    const result = await response.json();
    console.log("Phản hồi từ server:", result);

    if (response.status !== 202) {
      throw new Error(`Kích hoạt thất bại với status ${response.status}: ${JSON.stringify(result)}`);
    }

    // 4. Theo dõi tiến độ cập nhật từ realtime database
    console.log("4. Đang theo dõi tiến độ xử lý dữ liệu...");
    let done = false;
    let attempts = 0;
    const maxAttempts = 120; // 2 phút

    while (!done && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const { data: currentFile, error: fetchErr } = await supabase
        .from("files")
        .select("*")
        .eq("id", fileId)
        .single();

      if (fetchErr || !currentFile) {
        console.error("Lỗi lấy thông tin file:", fetchErr);
        continue;
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Trạng thái: ${currentFile.status} | Tiến độ: ${currentFile.processed_rows}/${currentFile.total_rows} dòng`
      );

      if (currentFile.status === "completed" || currentFile.status === "failed") {
        done = true;
        console.log(`\nKết thúc xử lý với trạng thái: ${currentFile.status.toUpperCase()}`);
        if (currentFile.status === "failed") {
          console.error(`Chi tiết lỗi: ${currentFile.error_log}`);
        }
      }
    }

    // 5. Xác minh kết quả trong Postgres
    console.log("\n5. Đang xác minh dữ liệu trong cơ sở dữ liệu...");

    // Kiểm tra excel_data_rows
    const { count: dataRowsCount, error: countErr } = await supabase
      .from("excel_data_rows")
      .select("*", { count: "exact", head: true })
      .eq("file_id", fileId);

    if (countErr) {
      console.error("Lỗi đếm số dòng dữ liệu:", countErr.message);
    } else {
      console.log(`Số dòng dữ liệu đã ghi nhận trong excel_data_rows: ${dataRowsCount}`);
    }

    // Xem thử một số dòng dữ liệu
    const { data: sampleRows, error: sampleErr } = await supabase
      .from("excel_data_rows")
      .select("row_index, content")
      .eq("file_id", fileId)
      .order("row_index", { ascending: true })
      .limit(3);

    if (sampleErr) {
      console.error("Lỗi lấy mẫu dữ liệu dòng:", sampleErr.message);
    } else if (sampleRows && sampleRows.length > 0) {
      console.log("Mẫu dữ liệu dòng chèn vào DB:");
      sampleRows.forEach(r => {
        console.log(`  - Dòng ${r.row_index}:`, JSON.stringify(r.content));
      });
    }

    // Kiểm tra excel_row_images
    const { data: rowImages, error: imagesErr } = await supabase
      .from("excel_row_images")
      .select("*")
      .eq("file_id", fileId);

    if (imagesErr) {
      console.error("Lỗi truy vấn excel_row_images:", imagesErr.message);
    } else {
      console.log(`Số hình ảnh đã liên kết trong excel_row_images: ${rowImages?.length || 0}`);
      if (rowImages && rowImages.length > 0) {
        console.log("Danh sách hình ảnh liên kết:");
        rowImages.forEach(img => {
          console.log(`  - Dòng ID: ${img.row_id} | Path: ${img.storage_path} | Tên gốc: ${img.original_name}`);
        });
      }
    }

    // Kiểm tra processing_logs
    const { data: logs, error: logsErr } = await supabase
      .from("processing_logs")
      .select("level, message, created_at")
      .eq("file_id", fileId)
      .order("created_at", { ascending: true });

    if (logsErr) {
      console.error("Lỗi lấy logs:", logsErr.message);
    } else if (logs && logs.length > 0) {
      console.log("Nhật ký logs xử lý:");
      logs.forEach(log => {
        console.log(`  [${log.level.toUpperCase()}] ${log.message}`);
      });
    }

  } catch (err: any) {
    console.error("Gặp lỗi trong quá trình kiểm thử:", err.message);
  }
}

runTest();
