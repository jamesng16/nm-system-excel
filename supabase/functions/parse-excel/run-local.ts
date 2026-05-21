import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import JSZip from "jszip";
import sax from "sax";
import { createClient } from "@supabase/supabase-js";

const PORT = 54330;

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Utility to guess MIME type
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg";
  return "application/octet-stream";
}

// XML parser to extract the drawing reference path from sheet1.xml.rels
async function getDrawingPath(zip: JSZip): Promise<string | null> {
  const relsFile = zip.file("xl/worksheets/_rels/sheet1.xml.rels");
  if (!relsFile) return null;
  const relsXml = await relsFile.async("string");

  let drawingPath: string | null = null;
  await new Promise<void>((resolve, reject) => {
    const parser = sax.parser(true);
    parser.onopentag = (node) => {
      if (node.name === "Relationship") {
        const type = node.attributes.Type as string;
        const target = node.attributes.Target as string;
        if (type && type.endsWith("/drawing") && target) {
          if (target.startsWith("../")) {
            drawingPath = "xl/" + target.substring(3);
          } else if (target.startsWith("/")) {
            drawingPath = target.substring(1);
          } else {
            drawingPath = "xl/worksheets/" + target;
          }
        }
      }
    };
    parser.onerror = (e) => reject(e);
    parser.onend = () => resolve();
    parser.write(relsXml).close();
  });
  return drawingPath;
}

// XML parser to extract drawing relationships (image IDs -> media files)
async function getDrawingRels(zip: JSZip, drawingPath: string): Promise<Record<string, string>> {
  const pathParts = drawingPath.split("/");
  const fileName = pathParts.pop();
  const dirPath = pathParts.join("/");
  const relsPat = `${dirPath}/_rels/${fileName}.rels`;

  const relsFile = zip.file(relsPat);
  if (!relsFile) return {};
  const relsXml = await relsFile.async("string");

  const relsMap: Record<string, string> = {};
  await new Promise<void>((resolve, reject) => {
    const parser = sax.parser(true);
    parser.onopentag = (node) => {
      if (node.name === "Relationship") {
        const id = node.attributes.Id as string;
        const target = node.attributes.Target as string;
        const type = node.attributes.Type as string;
        if (id && target && type && type.endsWith("/image")) {
          let imgPath = "";
          if (target.startsWith("../")) {
            imgPath = "xl/" + target.substring(3);
          } else if (target.startsWith("/")) {
            imgPath = target.substring(1);
          } else {
            imgPath = dirPath + "/" + target;
          }
          relsMap[id] = imgPath;
        }
      }
    };
    parser.onerror = (e) => reject(e);
    parser.onend = () => resolve();
    parser.write(relsXml).close();
  });
  return relsMap;
}

// XML parser to map 0-based drawing row indexes to image media files
async function mapDrawingRows(
  zip: JSZip,
  drawingPath: string,
  relsMap: Record<string, string>
): Promise<Record<number, string[]>> {
  const drawingFile = zip.file(drawingPath);
  if (!drawingFile) return {};
  const drawingXml = await drawingFile.async("string");

  const rowToImages: Record<number, string[]> = {};

  await new Promise<void>((resolve, reject) => {
    const parser = sax.parser(true);
    let inFrom = false;
    let inRow = false;
    let currentRowVal = "";
    let activeRow: number | null = null;
    let activeEmbedId: string | null = null;

    parser.onopentag = (node) => {
      const name = node.name;
      if (name === "xdr:twoCellAnchor" || name === "twoCellAnchor" ||
          name === "xdr:oneCellAnchor" || name === "oneCellAnchor") {
        activeRow = null;
        activeEmbedId = null;
      } else if (name === "xdr:from" || name === "from") {
        inFrom = true;
      } else if (inFrom && (name === "xdr:row" || name === "row")) {
        inRow = true;
        currentRowVal = "";
      } else if (name === "a:blip" || name === "blip") {
        const embedId = (node.attributes["r:embed"] || node.attributes["embed"]) as string;
        if (embedId) {
          activeEmbedId = embedId;
        }
      }
    };

    parser.ontext = (text) => {
      if (inRow) {
        currentRowVal += text;
      }
    };

    parser.onclosetag = (tagName) => {
      if (tagName === "xdr:from" || tagName === "from") {
        inFrom = false;
      } else if (tagName === "xdr:row" || tagName === "row") {
        inRow = false;
        if (currentRowVal.trim()) {
          activeRow = parseInt(currentRowVal.trim(), 10);
        }
      } else if (tagName === "xdr:twoCellAnchor" || tagName === "twoCellAnchor" ||
                 tagName === "xdr:oneCellAnchor" || tagName === "oneCellAnchor") {
        if (activeRow !== null && activeEmbedId !== null) {
          const imgPath = relsMap[activeEmbedId];
          if (imgPath) {
            const excelRowIndex = activeRow + 1; // Convert 0-based to 1-based row index
            if (!rowToImages[excelRowIndex]) {
              rowToImages[excelRowIndex] = [];
            }
            rowToImages[excelRowIndex].push(imgPath);
          }
        }
        activeRow = null;
        activeEmbedId = null;
      }
    };

    parser.onerror = (e) => reject(e);
    parser.onend = () => resolve();
    parser.write(drawingXml).close();
  });

  return rowToImages;
}

// Function to handle the actual background parsing and ingestion
async function parseExcelAndIngest({
  fileId,
  filePath,
  supabaseUrl,
  supabaseServiceKey,
}: {
  fileId: string;
  filePath: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
}) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const tempMediaDir = `/tmp/media_${fileId}`;

  try {
    console.log(`[Parser] Đang mở tệp Excel tại ${filePath}...`);
    const fileBytes = fs.readFileSync(filePath);

    console.log(`[Parser] Đang nạp cấu trúc ZIP...`);
    const zip = await JSZip.loadAsync(fileBytes);

    // 1. Phân tích sharedStrings.xml
    const sharedStrings: string[] = [];
    const sharedStringsFile = zip.file("xl/sharedStrings.xml");
    if (sharedStringsFile) {
      console.log(`[Parser] Đang giải nén và parse sharedStrings.xml...`);
      const sharedStringsXml = await sharedStringsFile.async("string");

      await new Promise<void>((resolve, reject) => {
        const parser = sax.parser(true);
        let inSi = false;
        let inT = false;
        let siText = "";

        parser.onopentag = (node) => {
          if (node.name === "si") {
            inSi = true;
            siText = "";
          } else if (node.name === "t") {
            inT = true;
          }
        };

        parser.ontext = (text) => {
          if (inSi && inT) {
            siText += text;
          }
        };

        parser.onclosetag = (tagName) => {
          if (tagName === "t") {
            inT = false;
          } else if (tagName === "si") {
            inSi = false;
            sharedStrings.push(siText);
          }
        };

        parser.onerror = (e) => reject(e);
        parser.onend = () => resolve();
        parser.write(sharedStringsXml).close();
      });
      console.log(`[Parser] Đã parse thành công ${sharedStrings.length} shared strings.`);
    }

    // 2. Trích xuất và ánh xạ hình ảnh (Phase 04-02)
    console.log(`[Parser] Đang phân tích quan hệ bản vẽ hình ảnh...`);
    let rowToImagesMap: Record<number, string[]> = {};
    try {
      const drawingPath = await getDrawingPath(zip);
      if (drawingPath) {
        console.log(`[Parser] Đã tìm thấy drawing XML: ${drawingPath}`);
        const relsMap = await getDrawingRels(zip, drawingPath);
        rowToImagesMap = await mapDrawingRows(zip, drawingPath, relsMap);
        console.log(`[Parser] Bản đồ ánh xạ ảnh dòng:`, JSON.stringify(rowToImagesMap));
      } else {
        console.log(`[Parser] Không tìm thấy hình vẽ hoặc mối quan hệ drawing trong file Excel.`);
      }
    } catch (imgErr: any) {
      console.warn(`[Parser Warning] Lỗi khi parse ánh xạ ảnh (bỏ qua để tiếp tục parse text):`, imgErr.message);
    }

    // Trích xuất các tệp ảnh ra đĩa tạm
    const extractedImages: Record<string, string> = {}; // maps ZipPath -> TempFilePath
    try {
      const mediaFiles = Object.keys(zip.files).filter(p => p.startsWith("xl/media/"));
      if (mediaFiles.length > 0) {
        console.log(`[Parser] Phát hiện ${mediaFiles.length} hình ảnh trong Excel, đang giải nén...`);
        if (!fs.existsSync(tempMediaDir)) {
          fs.mkdirSync(tempMediaDir, { recursive: true });
        }
        for (const p of mediaFiles) {
          const zipFile = zip.file(p);
          if (zipFile && !zipFile.dir) {
            const imgName = path.basename(p);
            const outPath = path.join(tempMediaDir, imgName);
            const buffer = await zipFile.async("nodebuffer");
            fs.writeFileSync(outPath, buffer);
            extractedImages[p] = outPath;
            console.log(`[Parser] Đã giải nén ảnh tạm: ${outPath}`);
          }
        }
      }
    } catch (mediaErr: any) {
      console.warn(`[Parser Warning] Lỗi khi trích xuất hình ảnh:`, mediaErr.message);
    }

    // Upload tất cả hình ảnh lên public bucket "excel-images"
    const uploadedImagesMap: Record<string, string> = {}; // maps ZipPath -> StoragePath
    for (const [zipPath, localPath] of Object.entries(extractedImages)) {
      try {
        const imgName = path.basename(zipPath);
        const storagePath = `files/${fileId}/images/${imgName}`;
        const fileBuffer = fs.readFileSync(localPath);

        console.log(`[Parser] Đang tải lên Storage: ${storagePath}...`);
        const { error: uploadError } = await supabase.storage
          .from("excel-images")
          .upload(storagePath, fileBuffer, {
            contentType: getMimeType(imgName),
            upsert: true
          });

        if (uploadError) {
          throw uploadError;
        }
        uploadedImagesMap[zipPath] = storagePath;
      } catch (uploadErr: any) {
        console.error(`[Parser Error] Lỗi upload ảnh ${zipPath}:`, uploadErr.message);
        await supabase.from("processing_logs").insert({
          file_id: fileId,
          level: "warning",
          message: `Lỗi tải ảnh ${path.basename(zipPath)} lên Storage: ${uploadErr.message}`
        });
      }
    }

    // 3. Parse sheet1.xml
    const sheetFile = zip.file("xl/worksheets/sheet1.xml");
    if (!sheetFile) {
      throw new Error("Không tìm thấy file sheet1.xml trong cấu trúc tệp Excel.");
    }

    console.log(`[Parser] Đang giải nén xl/worksheets/sheet1.xml...`);
    const sheetXml = await sheetFile.async("string");
    console.log(`[Parser] Đang parse sheet1.xml...`);

    let headers: Record<string, string> = {};
    let maxRowIndex = 0;

    // Lần quét 1: Xác định tổng số dòng (maxRowIndex)
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

    console.log(`[Parser] Tổng số dòng phát hiện được: ${maxRowIndex}`);

    // Cập nhật tổng số dòng vào database
    await supabase
      .from("files")
      .update({
        total_rows: maxRowIndex,
        status: "processing",
        updated_at: new Date().toISOString()
      })
      .eq("id", fileId);

    // Lần quét 2: Đọc dữ liệu dòng theo dòng và bulk insert
    const rowUuidMap: Record<number, string> = {}; // Lưu UUID của các dòng đã insert để liên kết ảnh

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

        console.log(`[Parser] Đang bulk insert lô ${currentBatch.length} dòng...`);
        const { data, error } = await supabase
          .from("excel_data_rows")
          .insert(currentBatch)
          .select("id, row_index");

        if (error) {
          console.error(`[Parser Error] Lỗi bulk insert:`, error.message);
          throw error;
        }

        // Lưu thông tin UUID đã chèn phục vụ mapping ảnh
        if (data) {
          for (const row of data) {
            rowUuidMap[row.row_index] = row.id;
          }
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
      };

      parser.onopentag = (node) => {
        if (node.name === "row") {
          const rAttr = node.attributes.r;
          currentRowIndex = rAttr ? parseInt(rAttr as string, 10) : 0;
          currentRowData = {};
        } else if (node.name === "c") {
          const rAttr = node.attributes.r as string;
          currentCellRef = rAttr ? rAttr.replace(/[0-9]/g, "") : "";
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
            const strId = parseInt(currentVal, 10);
            finalVal = sharedStrings[strId] !== undefined ? sharedStrings[strId] : "";
          } else if (currentCellType === "n" || !currentCellType) {
            const parsedNum = parseFloat(currentVal);
            if (!isNaN(parsedNum)) finalVal = parsedNum;
          } else if (currentCellType === "b") {
            finalVal = currentVal === "1";
          }

          if (currentCellRef) {
            currentRowData[currentCellRef] = finalVal;
          }
        } else if (tagName === "row") {
          if (currentRowIndex === 1) {
            headers = { ...currentRowData };
            console.log(`[Parser] Khởi tạo Header:`, headers);
          } else if (currentRowIndex > 1) {
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

    // 4. Liên kết ảnh với dòng (excel_row_images)
    console.log(`[Parser] Đang liên kết hình ảnh với dòng dữ liệu trong Postgres...`);
    const linkBatch: any[] = [];
    for (const [excelRowStr, imgPaths] of Object.entries(rowToImagesMap)) {
      const excelRowIndex = parseInt(excelRowStr, 10);
      const rowId = rowUuidMap[excelRowIndex];
      if (!rowId) {
        console.warn(`[Parser Warning] Không tìm thấy UUID trong DB cho dòng ${excelRowIndex}, bỏ qua liên kết ảnh.`);
        continue;
      }

      for (const imgZipPath of imgPaths) {
        const storagePath = uploadedImagesMap[imgZipPath];
        if (storagePath) {
          linkBatch.push({
            row_id: rowId,
            file_id: fileId,
            storage_path: storagePath,
            original_name: path.basename(imgZipPath)
          });
        }
      }
    }

    if (linkBatch.length > 0) {
      console.log(`[Parser] Đang ghi ${linkBatch.length} bản ghi liên kết hình ảnh vào excel_row_images...`);
      const { error: linkError } = await supabase
        .from("excel_row_images")
        .insert(linkBatch);

      if (linkError) {
        console.error(`[Parser Error] Không thể ghi liên kết ảnh:`, linkError.message);
        throw linkError;
      }
    }

    // 5. Hoàn tất xử lý
    console.log(`[Parser] Hoàn tất xử lý tệp '${fileId}'! Cập nhật trạng thái...`);
    await supabase
      .from("files")
      .update({
        status: "completed",
        processed_rows: maxRowIndex,
        updated_at: new Date().toISOString()
      })
      .eq("id", fileId);

    await supabase.from("processing_logs").insert({
      file_id: fileId,
      level: "info",
      message: `Tệp Excel '${fileId}' đã được parse và bulk insert thành công với ${maxRowIndex} dòng và ${linkBatch.length} hình ảnh liên kết.`
    });

  } catch (err: any) {
    console.error(`[Parser Error] Lỗi xử lý nghiêm trọng:`, err.message);

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
      console.error(`[Parser Error] Không thể ghi log lỗi vào database:`, dbErr.message);
    }
    throw err;
  } finally {
    // Dọn dẹp đĩa tạm
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Parser] Đã xóa tệp Excel tạm: ${filePath}`);
      }
    } catch (e) {}

    try {
      if (fs.existsSync(tempMediaDir)) {
        fs.rmSync(tempMediaDir, { recursive: true, force: true });
        console.log(`[Parser] Đã dọn dẹp thư mục hình ảnh tạm: ${tempMediaDir}`);
      }
    } catch (e) {}
  }
}

// Start HTTP Server
const server = http.createServer((req, res) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    res.writeHead(200, corsHeaders);
    res.end("ok");
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
          throw new Error("Thiếu cấu hình biến môi trường SUPABASE_SERVICE_ROLE_KEY");
        }

        const { fileId } = JSON.parse(body);
        if (!fileId) {
          res.writeHead(400, { ...corsHeaders, "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Tham số 'fileId' là bắt buộc." }));
          return;
        }

        console.log(`[Server] Nhận yêu cầu parse file ID: ${fileId}`);
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Kiểm tra file record
        const { data: fileRecord, error: fileError } = await supabase
          .from("files")
          .select("*")
          .eq("id", fileId)
          .single();

        if (fileError || !fileRecord) {
          res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Không tìm thấy thông tin tệp tin có ID: ${fileId}` }));
          return;
        }

        // 2. Download tệp từ storage về đĩa tạm
        const sanitizedName = fileRecord.name.normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[đĐ]/g, "d")
          .replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${fileId}/${sanitizedName}`;
        console.log(`[Server] Đang tải tệp ${storagePath} từ storage...`);

        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from("excel-uploads")
          .download(storagePath);

        if (downloadError || !fileBlob) {
          throw new Error(`Lỗi tải xuống tệp tin gốc từ Storage: ${downloadError?.message || 'Không nhận được dữ liệu'}`);
        }

        const tempFilePath = `/tmp/excel_${fileId}.xlsx`;
        const arrayBuffer = await fileBlob.arrayBuffer();
        fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));
        console.log(`[Server] Đã ghi tệp tạm: ${tempFilePath}`);

        // 3. Khởi chạy background job xử lý bất đồng bộ
        (async () => {
          try {
            await parseExcelAndIngest({
              fileId,
              filePath: tempFilePath,
              supabaseUrl,
              supabaseServiceKey,
            });
          } catch (err: any) {
            console.error(`[Background Error] Xử lý tệp ${fileId} thất bại:`, err.message);
          }
        })();

        // Trả về HTTP 202 Accepted
        res.writeHead(202, { ...corsHeaders, "Content-Type": "application/json" });
        res.end(JSON.stringify({
          message: "Yêu cầu xử lý tệp Excel đã được tiếp nhận thành công.",
          fileId,
          status: "processing",
        }));

      } catch (err: any) {
        console.error(`[Server Error]`, err.message);
        res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message || "Lỗi xử lý server nội bộ" }));
      }
    });
    return;
  }

  res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Không tìm thấy endpoint tương ứng." }));
});

server.listen(PORT, () => {
  console.log(`[Local Function Server] Đang chạy tại http://localhost:${PORT}`);
});
