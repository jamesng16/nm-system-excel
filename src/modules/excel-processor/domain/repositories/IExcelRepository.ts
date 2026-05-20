import { ExcelFile } from '../entities/ExcelFile';
import { ExcelRow } from '../entities/ExcelRow';

export interface IExcelRepository {
  uploadFile(file: File, onProgress?: (percent: number) => void): Promise<ExcelFile>;
  getFiles(): Promise<ExcelFile[]>;
  getFileById(id: string): Promise<ExcelFile | null>;
  getIngestedRows(fileId: string): Promise<ExcelRow[]>;
  subscribeToProcessingStatus(fileId: string, callback: (file: ExcelFile) => void): () => void;
}
