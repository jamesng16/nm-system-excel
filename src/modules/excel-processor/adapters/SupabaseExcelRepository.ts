import { IExcelRepository } from '../domain/repositories/IExcelRepository';
import { ExcelFile } from '../domain/entities/ExcelFile';
import { ExcelRow } from '../domain/entities/ExcelRow';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { supabase } from '../../../shared/infra/supabase';

export class SupabaseExcelRepository implements IExcelRepository {
  private files: ExcelFile[] = [];
  private rowsMap: Record<string, ExcelRow[]> = {};
  private statusListeners: Record<string, ((file: ExcelFile) => void)[]> = {};

  async uploadFile(file: File, onProgress?: (percent: number) => void): Promise<ExcelFile> {
    if (onProgress) {
      for (let i = 10; i <= 100; i += 20) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        onProgress(Math.min(i, 100));
      }
    }

    const fileId = 'mock-file-id-' + Math.random().toString(36).substring(2, 9);
    const estimatedRows = Math.max(100, Math.floor(file.size / 1024));

    const newFile: ExcelFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      status: 'pending',
      totalRows: estimatedRows,
      processedRows: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.files.push(newFile);

    const mockRows: ExcelRow[] = Array.from({ length: Math.min(estimatedRows, 15) }).map((_, index) => ({
      id: `mock-row-id-${fileId}-${index}`,
      fileId: fileId,
      rowIndex: index + 1,
      content: {
        'Mã nhân viên': `NV${1000 + index}`,
        'Họ và tên': index % 2 === 0 ? 'Nguyễn Văn A' : 'Trần Thị B',
        'Phòng ban': index % 3 === 0 ? 'Phát triển' : 'Kinh doanh',
        'Lương cơ bản': 15000000 + index * 500000,
        'Trạng thái': 'Hoạt động',
      },
      createdAt: new Date().toISOString(),
    }));
    this.rowsMap[fileId] = mockRows;

    this.simulateProcessing(fileId);

    return newFile;
  }

  async getFiles(): Promise<ExcelFile[]> {
    return this.files;
  }

  async getFileById(id: string): Promise<ExcelFile | null> {
    return this.files.find((f) => f.id === id) || null;
  }

  async getIngestedRows(fileId: string): Promise<ExcelRow[]> {
    return this.rowsMap[fileId] || [];
  }

  subscribeToProcessingStatus(fileId: string, callback: (file: ExcelFile) => void): () => void {
    if (!this.statusListeners[fileId]) {
      this.statusListeners[fileId] = [];
    }
    this.statusListeners[fileId].push(callback);

    const file = this.files.find((f) => f.id === fileId);
    if (file) {
      callback(file);
    }

    return () => {
      this.statusListeners[fileId] = this.statusListeners[fileId].filter((l) => l !== callback);
    };
  }

  private simulateProcessing(fileId: string) {
    let step = 0;
    const interval = setInterval(() => {
      const fileIndex = this.files.findIndex((f) => f.id === fileId);
      if (fileIndex === -1) {
        clearInterval(interval);
        return;
      }

      const file = this.files[fileIndex];
      if (step === 0) {
        file.status = 'processing';
        file.processedRows = Math.floor(file.totalRows * 0.3);
        step++;
      } else if (step === 1) {
        file.processedRows = Math.floor(file.totalRows * 0.7);
        step++;
      } else if (step === 2) {
        file.status = 'completed';
        file.processedRows = file.totalRows;
        clearInterval(interval);
      }

      file.updatedAt = new Date().toISOString();
      this.files[fileIndex] = { ...file };

      const listeners = this.statusListeners[fileId] || [];
      listeners.forEach((listener) => listener({ ...file }));
    }, 1500);
  }
}
