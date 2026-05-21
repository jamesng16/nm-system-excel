import { IExcelRepository } from '../domain/repositories/IExcelRepository';

export class DeleteFile {
  constructor(private excelRepository: IExcelRepository) {}

  async execute(fileId: string): Promise<void> {
    if (!fileId) {
      throw new Error('ID file không được để trống');
    }
    return this.excelRepository.deleteFile(fileId);
  }
}
