import { IExcelRepository } from '../domain/repositories/IExcelRepository';
import { ProcessingLog } from '../domain/entities/ProcessingLog';

export class GetProcessingLogs {
  constructor(private excelRepository: IExcelRepository) {}

  async execute(fileId: string): Promise<ProcessingLog[]> {
    if (!fileId) {
      throw new Error('ID file không được để trống');
    }
    return this.excelRepository.getProcessingLogs(fileId);
  }
}
