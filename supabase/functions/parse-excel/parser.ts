import sax from "https://esm.sh/sax@1.3.0";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export interface ParseExcelOptions {
  fileId: string;
  filePath: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export async function parseExcelAndIngest({
  fileId,
  filePath,
  supabaseUrl,
  supabaseServiceKey,
}: ParseExcelOptions) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const tempDbPath = `/tmp/shared_strings_${fileId}.db`;
  let sqliteDb: DB | null = null;

  try {
    console.log(`[Parser] Đang mở tệp Excel tại ${filePath}...`);
    const fileBytes = await Deno.readFile(filePath);

    console.log(`[Parser] Đang nạp cấu trúc ZIP...`);
    const zip = await JSZip.loadAsync(fileBytes);

    // 1. Tạo SQLite để lưu trữ tạm sharedStrings
    sqliteDb = new DB(tempDbPath);
    sqliteDb.execute(`
      CREATE TABLE IF NOT EXISTS shared_strings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        val TEXT
      )
    `);

    // 2. Parse sharedStrings.xml nếu tồn tại
    const sharedStringsFile = zip.file("xl/sharedStrings.xml");
    if (sharedStringsFile) {
      console.log(`[Parser] Phát hiện xl/sharedStrings.xml, đang giải nén...`);
      const sharedStringsXml = await sharedStringsFile.async("string");
      console.log(`[Parser] Đang parse sharedStrings XML và lưu vào SQLite...`);

      await new Promise<void>((resolve, reject) => {
        const parser = sax.parser(true);
        let inT = false;
        let currentString = "";
        let count = 0;
        let batch: string[] = [];

        const flushBatch = () => {
          if (batch.length === 0) return;
          sqliteDb!.query("BEGIN TRANSACTION");
          const stmt = sqliteDb!.prepareQuery("INSERT INTO shared_strings (val) VALUES (?)");
          try {
            for (const val of batch) {
              stmt.execute([val]);
            }
            sqliteDb!.query("COMMIT");
          } catch (e) {
            sqliteDb!.query("ROLLBACK");
            throw e;
          } finally {
            stmt.finalize();
          }
          batch = [];
        };

        parser.onopentag = (node) => {
          if (node.name === "t") {
            inT = true;
            currentString = "";
          }
        };

        parser.ontext = (text) => {
          if (inT) {
            currentString += text;
          }
        };

        parser.onclosetag = (tagName) => {
          if (tagName === "t") {
            inT = false;
            batch.push(currentString);
            count++;
            if (batch.length >= 1000) {
              flushBatch();
            }
          }
        };

        parser.onerror = (e) => reject(e);
        parser.onend = () => {
          flushBatch();
          console.log(`[Parser] Parse thành công ${count} shared strings.`);
          resolve();
        };

        parser.write(sharedStringsXml).close();
      });
    }

    // 3. Tạo index trên SQLite để truy vấn cực nhanh
    sqliteDb.execute("CREATE INDEX IF NOT EXISTS idx_shared_strings_id ON shared_strings(id)");

    // 4. Tìm kiếm toạ độ hình ảnh nhúng (nếu có)
    // Sẽ được tích hợp chi tiết ở Phase 04-02, tạm thời trả về một map trống
    const imageRowMap: Record<number, string[]> = {};

    // 5. Parse sheet1.xml
    const sheetFile = zip.file("xl/worksheets/sheet1.xml");
    if (!sheetFile) {
      throw new Error("Không tìm thấy file sheet1.xml trong cấu trúc tệp Excel.");
    }

    console.log(`[Parser] Đang giải nén xl/worksheets/sheet1.xml...`);
    const sheetXml = await sheetFile.async("string");
    console.log(`[Parser] Đang parse sheet1 XML và bắt đầu ingest...`);

    // Lấy thông tin Header từ hàng đầu tiên
    let headers: Record<string, string> = {}; // { "A": "Họ và tên", "B": "Mã NV" }
    let maxRowIndex = 0;

    // Lần quét 1: Xác định tổng số dòng (maxRowIndex) để cập nhật DB
    await new Promise<void>((resolve, reject) => {
      const parser = sax.parser(true);
      parser.onopentag = (node) => {
        if (node.name === "row") {
          const rAttr = node.attributes.r;
          if (rAttr) {
            const idx = parseInt(rAttr as string, 10);
            if (idx > maxRowIndex) maxRowIndex = idx;
          }
        }
      };
      parser.onerror = (e) => reject(e);
      parser.onend = () => resolve();
      parser.write(sheetXml).close();
    });

    console.log(`[Parser] Tổng số dòng phát hiện được trong Excel: ${maxRowIndex}`);

    // Cập nhật tổng số dòng vào DB
    await supabase
      .from("files")
      .update({
        total_rows: maxRowIndex,
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", fileId);

    // Lần quét 2: Đọc dữ liệu dòng theo dòng và bulk insert
    await new Promise<void>((resolve, reject) => {
      const parser = sax.parser(true);
      let currentRowIndex = 0;
      let currentCellRef = "";
      let currentCellType = "";
      let inV = false;
      let currentVal = "";
      let currentRowData: Record<string, any> = {};
      let insertBatch: any[] = [];
      let processedCount = 0;

      const flushInsertBatch = async () => {
        if (insertBatch.length === 0) return;
        const currentBatch = [...insertBatch];
        insertBatch = [];

        const { data, error } = await supabase
          .from("excel_data_rows")
          .insert(currentBatch)
          .select("id, row_index");

        if (error) {
          console.error(`[Parser] Lỗi bulk insert vào Postgres:`, error.message);
          throw error;
        }

        // Cập nhật tiến độ dòng đã xử lý
        processedCount += currentBatch.length;
        await supabase
          .from("files")
          .update({
            processed_rows: processedCount,
            updated_at: new Date().toISOString()
          })
          .eq("id", fileId);

        // Lưu thông tin UUID đã chèn phục vụ mapping ảnh ở 04-02
        if (data) {
          for (const row of data) {
            const rIdx = row.row_index;
            // Ở 04-02 ta sẽ lấy row.id để chèn quan hệ ảnh
          }
        }
      };

      parser.onopentag = (node) => {
        if (node.name === "row") {
          const rAttr = node.attributes.r;
          currentRowIndex = rAttr ? parseInt(rAttr as string, 10) : 0;
          currentRowData = {};
        } else if (node.name === "c") {
          const rAttr = node.attributes.r as string; // Ví dụ "A1", "B2"
          currentCellRef = rAttr ? rAttr.replace(/[0-9]/g, "") : ""; // Trích xuất cột "A", "B"
          currentCellType = (node.attributes.t as string) || "";
        } else if (node.name === "v") {
          inV = true;
          currentVal = "";
        }
      };

      parser.ontext = (text) => {
        if (inV) {
          currentVal += text;
        }
      };

      parser.onclosetag = async (tagName) => {
        if (tagName === "v") {
          inV = false;
          let finalVal: any = currentVal;

          if (currentCellType === "s") {
            // Đọc từ SQLite shared strings
            const strId = parseInt(currentVal, 10) + 1; // SQLite autoincrement starts at 1, Excel sharedStringIndex starts at 0
            const rows = sqliteDb!.query("SELECT val FROM shared_strings WHERE id = ?", [strId]);
            if (rows.length > 0) {
              finalVal = rows[0][0];
            } else {
              finalVal = "";
            }
          } else if (currentCellType === "n" || !currentCellType) {
            // Kiểu số
            const parsedNum = parseFloat(currentVal);
            if (!isNaN(parsedNum)) finalVal = parsedNum;
          } else if (currentCellType === "b") {
            // Kiểu boolean
            finalVal = currentVal === "1";
          }

          if (currentCellRef) {
            currentRowData[currentCellRef] = finalVal;
          }
        } else if (tagName === "row") {
          if (currentRowIndex === 1) {
            // Hàng đầu tiên chứa tên cột (Headers)
            headers = { ...currentRowData };
            console.log(`[Parser] Khởi tạo Header thành công:`, headers);
          } else if (currentRowIndex > 1) {
            // Ánh xạ dữ liệu ô sang key là Header tương ứng
            const mappedContent: Record<string, any> = {};
            for (const [colRef, val] of Object.entries(currentRowData)) {
              const headerName = headers[colRef] || `Cột ${colRef}`;
              mappedContent[headerName] = val;
            }

            insertBatch.push({
              file_id: fileId,
              row_index: currentRowIndex,
              content: mappedContent,
            });

            if (insertBatch.length >= 1000) {
              // Dùng await để đồng bộ hóa và tránh quá tải DB connection
              parser.pause();
              try {
                await flushInsertBatch();
              } catch (e) {
                reject(e);
                return;
              }
              parser.resume();
            }
          }
        }
      };

      parser.onerror = (e) => reject(e);
      parser.onend = async () => {
        try {
          await flushInsertBatch();
          resolve();
        } catch (e) {
          reject(e);
        }
      };

      parser.write(sheetXml).close();
    });

    console.log(`[Parser] Đang cập nhật trạng thái file thành completed...`);
    // 6. Hoàn tất xử lý, cập nhật file status thành completed
    await supabase
      .from("files")
      .update({
        status: "completed",
        processed_rows: maxRowIndex,
        updated_at: new Date().toISOString()
      })
      .eq("id", fileId);

    // Ghi log thành công
    await supabase.from("processing_logs").insert({
      file_id: fileId,
      level: "info",
      message: `Tệp Excel '${fileId}' đã được parse và bulk insert thành công với ${maxRowIndex} dòng.`
    });

  } catch (err: any) {
    console.error(`[Parser] Gặp lỗi nghiêm trọng:`, err.message);

    // Ghi nhận lỗi vào Postgres
    try {
      await supabase
        .from("files")
        .update({
          status: "failed",
          error_log: err.message || "Lỗi parse không xác định",
          updated_at: new Date().toISOString()
        })
        .eq("id", fileId);

      await supabase.from("processing_logs").insert({
        file_id: fileId,
        level: "error",
        message: `Lỗi xử lý tệp: ${err.message || 'Lỗi không xác định'}`
      });
    } catch (dbErr: any) {
      console.error(`[Parser] Không thể ghi log lỗi vào database:`, dbErr.message);
    }

    throw err;
  } finally {
    // 7. Dọn dẹp tài nguyên
    if (sqliteDb) {
      try {
        sqliteDb.close();
      } catch (e) {
        console.error("Lỗi đóng SQLite:", e);
      }
    }

    try {
      await Deno.remove(tempDbPath);
      console.log(`[Parser] Đã xóa database SQLite tạm thời: ${tempDbPath}`);
    } catch (e) {
      // Bỏ qua nếu file không tồn tại
    }

    try {
      await Deno.remove(filePath);
      console.log(`[Parser] Đã xóa tệp Excel tạm thời: ${filePath}`);
    } catch (e) {
      // Bỏ qua
    }
  }
}
