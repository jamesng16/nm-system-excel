import { IExcelRepository } from '../domain/repositories/IExcelRepository';
import { ExcelFile } from '../domain/entities/ExcelFile';

export class UploadExcel {
  constructor(private excelRepository: IExcelRepository) {}

  async execute(file: File, onProgress?: (percent: number) => void): Promise<ExcelFile> {
    if (!file) {
      throw new Error('File không được để trống');
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      throw new Error('Định dạng file không hỗ trợ. Vui lòng tải lên file Excel (.xlsx, .xls)');
    }

    // Giới hạn kích thước tối đa (ví dụ 200MB)
    const MAX_SIZE = 200 * 1024 * 1024; // 200mb
    if (file.size > MAX_SIZE) {
      throw new Error('Kích thước file vượt quá giới hạn cho phép (tối đa 200MB)');
    }

    return this.excelRepository.uploadFile(file, onProgress);
  }
}
