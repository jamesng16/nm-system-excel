import { ExcelRowImage } from './ExcelRowImage';

export interface ExcelRow {
  id: string;
  fileId: string;
  rowIndex: number;
  content: Record<string, any>;
  createdAt?: string;
  images?: ExcelRowImage[];
}
