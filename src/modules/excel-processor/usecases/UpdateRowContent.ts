import { IExcelRepository } from '../domain/repositories/IExcelRepository';
import { ExcelRow } from '../domain/entities/ExcelRow';

export class UpdateRowContent {
  constructor(private excelRepository: IExcelRepository) {}

  async execute(rowId: string, content: Record<string, any>): Promise<ExcelRow> {
    if (!rowId) {
      throw new Error('ID dòng không được để trống');
    }
    if (!content || Object.keys(content).length === 0) {
      throw new Error('Nội dung cập nhật không được để trống');
    }
    return this.excelRepository.updateRowContent(rowId, content);
  }
}
