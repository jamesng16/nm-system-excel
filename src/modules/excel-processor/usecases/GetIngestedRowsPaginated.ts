import { IExcelRepository } from '../domain/repositories/IExcelRepository';
import { ExcelRow } from '../domain/entities/ExcelRow';

export class GetIngestedRowsPaginated {
  constructor(private excelRepository: IExcelRepository) {}

  async execute(
    fileId: string,
    page: number,
    pageSize: number,
    searchTerm?: string,
    searchColumn?: string
  ): Promise<{ rows: ExcelRow[]; totalCount: number }> {
    if (!fileId) {
      throw new Error('ID file không được để trống');
    }
    if (page < 1) {
      throw new Error('Trang không hợp lệ');
    }
    if (pageSize < 1) {
      throw new Error('Kích thước trang không hợp lệ');
    }
    return this.excelRepository.getIngestedRowsPaginated(
      fileId,
      page,
      pageSize,
      searchTerm,
      searchColumn
    );
  }
}
