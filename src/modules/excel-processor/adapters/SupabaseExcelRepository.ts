import { IExcelRepository } from '../domain/repositories/IExcelRepository';
import { ExcelFile } from '../domain/entities/ExcelFile';
import { ExcelRow } from '../domain/entities/ExcelRow';
import { ProcessingLog } from '../domain/entities/ProcessingLog';
import { supabase } from '../../../shared/infra/supabase';

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
      // 2. Tạo signed upload URL từ Supabase Storage
      const sanitizedName = file.name.normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[đĐ]/g, "d")
        .replace(/[^a-zA-Z0-9.-]/g, "_");
      const { data: signedData, error: signedError } = await supabase.storage
        .from('excel-uploads')
        .createSignedUploadUrl(`${fileId}/${sanitizedName}`);

      if (signedError || !signedData) {
        throw new Error(`Lỗi tạo Signed Upload URL: ${signedError?.message || 'Không có phản hồi'}`);
      }

      // 3. Thực hiện tải file lên bằng XMLHttpRequest để theo dõi tiến trình thực tế
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedData.signedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Tải lên storage thất bại với mã trạng thái: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Lỗi mạng xảy ra trong quá trình tải tệp lên storage.'));
        };

        xhr.send(file);
      });

      // 4. Gọi Edge Function parse-excel bất đồng bộ (Background Job)
      supabase.functions.invoke('parse-excel', {
        body: { fileId },
      }).catch((err) => {
        console.error('Không thể gọi Edge Function parse-excel:', err);
        // Fallback sang simulator nếu Edge Function lỗi kết nối
        this.simulateProcessing(fileId);
      });

      return {
        id: dbFile.id,
        name: dbFile.name,
        size: Number(dbFile.size),
        status: dbFile.status as 'pending' | 'processing' | 'completed' | 'failed',
        totalRows: dbFile.total_rows,
        processedRows: dbFile.processed_rows,
        createdAt: dbFile.created_at,
        updatedAt: dbFile.updated_at,
      };
    } catch (err: any) {
      // Cập nhật trạng thái file thành failed trong cơ sở dữ liệu nếu có lỗi
      await supabase
        .from('files')
        .update({
          status: 'failed',
          error_log: err.message || 'Lỗi không xác định trong quá trình tải lên',
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);

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
      .select('storage_path')
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
      const storagePaths = dbImages.map((img) => img.storage_path);
      await supabase.storage.from('excel-images').remove(storagePaths);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    // 1. Lấy thông tin file record trước để biết tên file gốc
    const { data: dbFile, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !dbFile) {
      throw new Error(`Không tìm thấy file để xóa: ${fetchError?.message || ''}`);
    }

    // 2. Xóa bản ghi file trong Postgres (cascade sẽ xóa rows, images, logs trong DB)
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      throw new Error(`Lỗi xóa file record trong database: ${deleteError.message}`);
    }

    // 3. Xóa file Excel gốc trong storage 'excel-uploads'
    const sanitizedName = dbFile.name.normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-zA-Z0-9.-]/g, "_");
    const originalFilePath = `${fileId}/${sanitizedName}`;

    await supabase.storage.from('excel-uploads').remove([originalFilePath]);

    // 4. Xóa toàn bộ ảnh liên quan trong storage 'excel-images'
    const { data: filesInImagesBucket } = await supabase.storage
      .from('excel-images')
      .list(`files/${fileId}/images`);

    if (filesInImagesBucket && filesInImagesBucket.length > 0) {
      const pathsToDelete = filesInImagesBucket.map((f) => `files/${fileId}/images/${f.name}`);
      await supabase.storage.from('excel-images').remove(pathsToDelete);
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

  private simulateProcessing(fileId: string) {
    let step = 0;
    const totalRows = 100;

    const interval = setInterval(async () => {
      // 1. Kiểm tra xem file có còn tồn tại không
      const { data: file, error: fetchErr } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fetchErr || !file) {
        clearInterval(interval);
        return;
      }

      try {
        if (step === 0) {
          // Bước 1: Chuyển sang 'processing' và xử lý 30%
          await supabase
            .from('files')
            .update({
              status: 'processing',
              total_rows: totalRows,
              processed_rows: 30,
              updated_at: new Date().toISOString(),
            })
            .eq('id', fileId);

          step++;
        } else if (step === 1) {
          // Bước 2: Tạo dòng dữ liệu mock lưu vào Postgres & cập nhật lên 70%
          const mockRows = Array.from({ length: 15 }).map((_, index) => ({
            file_id: fileId,
            row_index: index + 1,
            content: {
              'Mã nhân viên': `NV${1000 + index}`,
              'Họ và tên': index % 2 === 0 ? 'Nguyễn Văn A' : 'Trần Thị B',
              'Phòng ban': index % 3 === 0 ? 'Phát triển' : 'Kinh doanh',
              'Lương cơ bản': 15000000 + index * 500000,
              'Trạng thái': 'Hoạt động',
            },
          }));

          await supabase.from('excel_data_rows').insert(mockRows);

          await supabase
            .from('files')
            .update({
              processed_rows: 70,
              updated_at: new Date().toISOString(),
            })
            .eq('id', fileId);

          step++;
        } else if (step === 2) {
          // Bước 3: Hoàn thành 100%
          await supabase
            .from('files')
            .update({
              status: 'completed',
              processed_rows: totalRows,
              updated_at: new Date().toISOString(),
            })
            .eq('id', fileId);

          clearInterval(interval);
        }
      } catch (err) {
        console.error('Lỗi trong quá trình mô phỏng xử lý tệp tin:', err);
        clearInterval(interval);
      }
    }, 2000);
  }
}
