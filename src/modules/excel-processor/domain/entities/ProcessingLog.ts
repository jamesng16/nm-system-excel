export interface ProcessingLog {
  id: string;
  fileId: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  createdAt: string;
}
