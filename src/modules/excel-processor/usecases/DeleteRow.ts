import { IExcelRepository } from '../domain/repositories/IExcelRepository';

export class DeleteRow {
  constructor(private excelRepository: IExcelRepository) {}

  async execute(rowId: string): Promise<void> {
    if (!rowId) {
      throw new Error('ID dòng không được để trống');
    }
    return this.excelRepository.deleteRow(rowId);
  }
}
