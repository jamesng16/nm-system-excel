import { ExcelFile } from '../entities/ExcelFile';
import { ExcelRow } from '../entities/ExcelRow';
import { ProcessingLog } from '../entities/ProcessingLog';

export interface IExcelRepository {
  uploadFile(file: File, onProgress?: (percent: number) => void): Promise<ExcelFile>;
  getFiles(): Promise<ExcelFile[]>;
  getFileById(id: string): Promise<ExcelFile | null>;
  getIngestedRows(fileId: string): Promise<ExcelRow[]>;
  getIngestedRowsPaginated(
    fileId: string,
    page: number,
    pageSize: number,
    searchTerm?: string,
    searchColumn?: string
  ): Promise<{ rows: ExcelRow[]; totalCount: number }>;
  updateRowContent(rowId: string, content: Record<string, any>): Promise<ExcelRow>;
  deleteRow(rowId: string): Promise<void>;
  deleteFile(fileId: string): Promise<void>;
  getProcessingLogs(fileId: string): Promise<ProcessingLog[]>;
  subscribeToProcessingStatus(fileId: string, callback: (file: ExcelFile) => void): () => void;
}
