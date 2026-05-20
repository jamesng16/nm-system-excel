import { IExcelRepository } from '../domain/repositories/IExcelRepository';
import { ExcelRow } from '../domain/entities/ExcelRow';

export class GetIngestedRows {
  constructor(private excelRepository: IExcelRepository) {}

  async execute(fileId: string): Promise<ExcelRow[]> {
    if (!fileId) {
      throw new Error('ID file không được để trống');
    }
    return this.excelRepository.getIngestedRows(fileId);
  }
}
