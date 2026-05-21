import { IExcelRepository } from '../domain/repositories/IExcelRepository';
import { ExcelFile } from '../domain/entities/ExcelFile';
import { ExcelRow } from '../domain/entities/ExcelRow';
import { ProcessingLog } from '../domain/entities/ProcessingLog';
import { supabase } from '../../../shared/infra/supabase';

type ParsedExcelRow = {
  rowIndex: number;
  content: Record<string, string | number | boolean | null>;
};

const RELATIONSHIP_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const MAX_BROWSER_PARSED_ROWS = 10000;

function getCellColumn(cellRef: string): string {
  return cellRef.replace(/[0-9]/g, '');
}

function getXmlElements(node: Document | Element, tagName: string): Element[] {
  const namespacedElements = Array.from(node.getElementsByTagNameNS('*', tagName));
  return namespacedElements.length > 0
    ? namespacedElements
    : Array.from(node.getElementsByTagName(tagName));
}

function assertValidXml(document: Document, label: string): void {
  const parserError = getXmlElements(document, 'parsererror')[0];
  if (parserError) {
    throw new Error(`Lỗi cú pháp XML trong ${label}: ${parserError.textContent || 'Không rõ lỗi'}`);
  }
}

function normalizeHeaderName(value: string, fallback: string): string {
  const name = value.trim() || fallback;
  if (['__proto__', 'constructor', 'prototype'].includes(name)) {
    return `${name}_column`;
  }
  return name;
}

function isSafeImageStoragePath(storagePath: string, fileId: string): boolean {
  return storagePath.startsWith(`files/${fileId}/images/`) && !storagePath.split('/').includes('..');
}

function getTextContent(node: Element): string {
  return getXmlElements(node, 't')
    .map((textNode) => textNode.textContent || '')
    .join('');
}

function parseCellValue(cell: Element, sharedStrings: string[]): string | number | boolean | null {
  const type = cell.getAttribute('t');
  const valueNode = getXmlElements(cell, 'v')[0];
  const inlineStringNode = getXmlElements(cell, 'is')[0];

  if (type === 'inlineStr' && inlineStringNode) {
    return getTextContent(inlineStringNode);
  }

  const rawValue = valueNode?.textContent || '';
  if (!rawValue) return null;

  if (type === 's') {
    return sharedStrings[Number(rawValue)] || '';
  }

  if (type === 'b') {
    return rawValue === '1';
  }

  if (type === 'str') {
    return rawValue;
  }

  const numericValue = Number(rawValue);
  return Number.isNaN(numericValue) ? rawValue : numericValue;
}

async function parseExcelRows(file: File): Promise<ParsedExcelRow[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xmlParser = new DOMParser();

  const sharedStringsFile = zip.file('xl/sharedStrings.xml');
  const sharedStrings: string[] = [];
  if (sharedStringsFile) {
    const sharedStringsXml = await sharedStringsFile.async('text');
    const sharedStringsDoc = xmlParser.parseFromString(sharedStringsXml, 'application/xml');
    assertValidXml(sharedStringsDoc, 'sharedStrings.xml');
    for (const item of getXmlElements(sharedStringsDoc, 'si')) {
      sharedStrings.push(getTextContent(item));
    }
  }

  const workbookXml = await zip.file('xl/workbook.xml')?.async('text');
  if (!workbookXml) {
    throw new Error('Không tìm thấy workbook.xml trong file Excel.');
  }

  const workbookDoc = xmlParser.parseFromString(workbookXml, 'application/xml');
  assertValidXml(workbookDoc, 'workbook.xml');
  const firstSheet = getXmlElements(workbookDoc, 'sheet')[0];
  const firstSheetRelId =
    firstSheet?.getAttributeNS(RELATIONSHIP_NAMESPACE, 'id') || firstSheet?.getAttribute('r:id');
  if (!firstSheetRelId) {
    throw new Error('Không tìm thấy sheet đầu tiên trong file Excel.');
  }

  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('text');
  if (!relsXml) {
    throw new Error('Không tìm thấy workbook relationships trong file Excel.');
  }

  const relsDoc = xmlParser.parseFromString(relsXml, 'application/xml');
  assertValidXml(relsDoc, 'workbook.xml.rels');
  const sheetRel = getXmlElements(relsDoc, 'Relationship')
    .find((rel) => rel.getAttribute('Id') === firstSheetRelId);
  const target = sheetRel?.getAttribute('Target');
  if (!target) {
    throw new Error('Không tìm thấy đường dẫn sheet đầu tiên trong file Excel.');
  }

  const normalizedTarget = target.replace(/^\//, '').replace(/^xl\//, '');
  const sheetPath = `xl/${normalizedTarget}`;
  const sheetXml = await zip.file(sheetPath)?.async('text');
  if (!sheetXml) {
    throw new Error(`Không tìm thấy dữ liệu sheet tại ${sheetPath}.`);
  }

  const sheetDoc = xmlParser.parseFromString(sheetXml, 'application/xml');
  assertValidXml(sheetDoc, sheetPath);
  const headers: Record<string, string> = {};
  const headerCounts: Record<string, number> = {};
  const rows: ParsedExcelRow[] = [];

  for (const row of getXmlElements(sheetDoc, 'row')) {
    const rowIndex = Number(row.getAttribute('r') || 0);
    const rowData: Record<string, string | number | boolean | null> = Object.create(null);

    for (const cell of getXmlElements(row, 'c')) {
      const cellRef = cell.getAttribute('r') || '';
      const column = getCellColumn(cellRef);
      if (!column) continue;
      rowData[column] = parseCellValue(cell, sharedStrings);
    }

    if (rowIndex === 1) {
      for (const [column, value] of Object.entries(rowData)) {
        const headerName = normalizeHeaderName(String(value || ''), `Cột ${column}`);
        headerCounts[headerName] = (headerCounts[headerName] || 0) + 1;
        headers[column] = headerCounts[headerName] === 1 ? headerName : `${headerName} (${headerCounts[headerName]})`;
      }
      continue;
    }

    if (rowIndex > 1 && Object.keys(rowData).length > 0) {
      const content: Record<string, string | number | boolean | null> = Object.create(null);
      for (const [column, value] of Object.entries(rowData)) {
        content[headers[column] || `Cột ${column}`] = value;
      }
      rows.push({ rowIndex, content });

      if (rows.length > MAX_BROWSER_PARSED_ROWS) {
        throw new Error(`File vượt quá giới hạn xử lý trực tiếp trên trình duyệt (${MAX_BROWSER_PARSED_ROWS} dòng).`);
      }
    }
  }

  return rows;
}

export class SupabaseExcelRepository implements IExcelRepository {
  async uploadFile(file: File, onProgress?: (percent: number) => void): Promise<ExcelFile> {
    // 1. Tạo bản ghi file trong Postgres với trạng thái ban đầu là 'pending'
    const { data: dbFile, error: insertError } = await supabase
      .from('files')
      .insert({
        name: file.name,
        size: file.size,
        status: 'pending',
        processed_rows: 0,
        total_rows: 0,
      })
      .select()
      .single();

    if (insertError || !dbFile) {
      throw new Error(`Lỗi khởi tạo tệp tin trong database: ${insertError?.message || 'Không có phản hồi'}`);
    }

    const fileId = dbFile.id;

    try {
      await supabase
        .from('files')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', fileId);

      const parsedRows = await parseExcelRows(file);
      const batchSize = 500;

      await supabase
        .from('files')
        .update({
          total_rows: parsedRows.length,
          processed_rows: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);

      for (let offset = 0; offset < parsedRows.length; offset += batchSize) {
        const batch = parsedRows.slice(offset, offset + batchSize).map((row) => ({
          file_id: fileId,
          row_index: row.rowIndex,
          content: row.content,
        }));

        const { error: rowsError } = await supabase.from('excel_data_rows').insert(batch);
        if (rowsError) {
          throw new Error(`Lỗi lưu dữ liệu Excel vào database: ${rowsError.message}`);
        }

        const processedRows = Math.min(offset + batch.length, parsedRows.length);
        await supabase
          .from('files')
          .update({
            processed_rows: processedRows,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fileId);

        if (onProgress) {
          onProgress(Math.round((processedRows / Math.max(parsedRows.length, 1)) * 100));
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const { data: completedFile, error: completedError } = await supabase
        .from('files')
        .update({
          status: 'completed',
          processed_rows: parsedRows.length,
          total_rows: parsedRows.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId)
        .select()
        .single();

      if (completedError || !completedFile) {
        throw new Error(`Lỗi hoàn tất xử lý file: ${completedError?.message || 'Không có phản hồi'}`);
      }

      await supabase.from('processing_logs').insert({
        file_id: fileId,
        level: 'info',
        message: `Đã parse Excel trên trình duyệt và lưu ${parsedRows.length} dòng vào database.`,
      });

      return {
        id: completedFile.id,
        name: completedFile.name,
        size: Number(completedFile.size),
        status: completedFile.status as 'pending' | 'processing' | 'completed' | 'failed',
        totalRows: completedFile.total_rows,
        processedRows: completedFile.processed_rows,
        createdAt: completedFile.created_at,
        updatedAt: completedFile.updated_at,
      };
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định trong quá trình tải lên';
      await Promise.allSettled([
        supabase.from('excel_data_rows').delete().eq('file_id', fileId),
        supabase
          .from('files')
          .update({
            status: 'failed',
            processed_rows: 0,
            total_rows: 0,
            error_log: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fileId),
      ]);

      throw err;
    }
  }

  async getFiles(): Promise<ExcelFile[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Lỗi truy vấn danh sách tệp tin: ${error.message}`);
    }

    return (data || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      size: Number(file.size),
      status: file.status,
      totalRows: file.total_rows,
      processedRows: file.processed_rows,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }));
  }

  async getFileById(id: string): Promise<ExcelFile | null> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      size: Number(data.size),
      status: data.status,
      totalRows: data.total_rows,
      processedRows: data.processed_rows,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async getIngestedRows(fileId: string): Promise<ExcelRow[]> {
    const { data, error } = await supabase
      .from('excel_data_rows')
      .select('*')
      .eq('file_id', fileId)
      .order('row_index', { ascending: true });

    if (error) {
      throw new Error(`Lỗi truy vấn dòng dữ liệu: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      fileId: row.file_id,
      rowIndex: row.row_index,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  async getIngestedRowsPaginated(
    fileId: string,
    page: number,
    pageSize: number,
    searchTerm?: string,
    searchColumn?: string
  ): Promise<{ rows: ExcelRow[]; totalCount: number }> {
    const offset = (page - 1) * pageSize;
    const { data, error } = await supabase.rpc('get_excel_rows_paginated', {
      p_file_id: fileId,
      p_page_size: pageSize,
      p_offset: offset,
      p_search_term: searchTerm || null,
      p_search_column: searchColumn || null,
    });

    if (error) {
      throw new Error(`Lỗi truy vấn dòng dữ liệu phân trang: ${error.message}`);
    }

    const mappedRows: ExcelRow[] = (data || []).map((row: any) => ({
      id: row.id,
      fileId: row.file_id,
      rowIndex: row.row_index,
      content: row.content,
      createdAt: row.created_at,
      images: (row.images || []).map((img: any) => ({
        id: img.id,
        rowId: img.row_id,
        fileId: img.file_id,
        storagePath: img.storage_path,
        originalName: img.original_name,
        publicUrl: supabase.storage.from('excel-images').getPublicUrl(img.storage_path).data.publicUrl,
        createdAt: img.created_at,
      })),
    }));

    const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;

    return {
      rows: mappedRows,
      totalCount,
    };
  }

  async updateRowContent(rowId: string, content: Record<string, any>): Promise<ExcelRow> {
    const { data, error } = await supabase
      .from('excel_data_rows')
      .update({ content })
      .eq('id', rowId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Lỗi cập nhật dòng dữ liệu: ${error?.message || 'Không tìm thấy dòng'}`);
    }

    return {
      id: data.id,
      fileId: data.file_id,
      rowIndex: data.row_index,
      content: data.content,
      createdAt: data.created_at,
    };
  }

  async deleteRow(rowId: string): Promise<void> {
    // 1. Lấy danh sách ảnh liên quan để xóa vật lý trong storage
    const { data: dbImages } = await supabase
      .from('excel_row_images')
      .select('storage_path, file_id')
      .eq('row_id', rowId);

    // 2. Xóa dòng dữ liệu trong DB (cascade tự động xóa liên kết trong excel_row_images)
    const { error } = await supabase
      .from('excel_data_rows')
      .delete()
      .eq('id', rowId);

    if (error) {
      throw new Error(`Lỗi xóa dòng dữ liệu: ${error.message}`);
    }

    // 3. Xóa vật lý file trong storage
    if (dbImages && dbImages.length > 0) {
      const storagePaths = dbImages
        .map((img) => img.storage_path)
        .filter((storagePath) => isSafeImageStoragePath(storagePath, dbImages[0].file_id));
      if (storagePaths.length > 0) {
        await supabase.storage.from('excel-images').remove(storagePaths);
      }
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    const { data: dbFile, error: fetchError } = await supabase
      .from('files')
      .select('id')
      .eq('id', fileId)
      .single();

    if (fetchError || !dbFile) {
      throw new Error(`Không tìm thấy file để xóa: ${fetchError?.message || ''}`);
    }

    const { data: dbImages, error: imagesError } = await supabase
      .from('excel_row_images')
      .select('storage_path')
      .eq('file_id', fileId);

    if (imagesError) {
      throw new Error(`Lỗi lấy danh sách ảnh để xóa: ${imagesError.message}`);
    }

    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      throw new Error(`Lỗi xóa file record trong database: ${deleteError.message}`);
    }

    if (dbImages && dbImages.length > 0) {
      const pathsToDelete = dbImages
        .map((img) => img.storage_path)
        .filter((storagePath) => isSafeImageStoragePath(storagePath, fileId));
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('excel-images').remove(pathsToDelete);
      }
    }
  }

  async getProcessingLogs(fileId: string): Promise<ProcessingLog[]> {
    const { data, error } = await supabase
      .from('processing_logs')
      .select('*')
      .eq('file_id', fileId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Lỗi lấy logs xử lý: ${error.message}`);
    }

    return (data || []).map((log: any) => ({
      id: log.id,
      fileId: log.file_id,
      level: log.level as 'info' | 'warning' | 'error',
      message: log.message,
      createdAt: log.created_at,
    }));
  }

  subscribeToProcessingStatus(fileId: string, callback: (file: ExcelFile) => void): () => void {
    const channel = supabase
      .channel(`file-status-${fileId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'files',
          filter: `id=eq.${fileId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          callback({
            id: updated.id,
            name: updated.name,
            size: Number(updated.size),
            status: updated.status as 'pending' | 'processing' | 'completed' | 'failed',
            totalRows: updated.total_rows,
            processedRows: updated.processed_rows,
            createdAt: updated.created_at,
            updatedAt: updated.updated_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

}
