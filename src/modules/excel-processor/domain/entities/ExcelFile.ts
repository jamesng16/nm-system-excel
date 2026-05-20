export interface ExcelFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  errorLog?: string;
  createdAt?: string;
  updatedAt?: string;
}
