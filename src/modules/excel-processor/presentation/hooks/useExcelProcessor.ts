import { useState, useEffect } from 'react';
import { ExcelFile } from '../../domain/entities/ExcelFile';
import { ExcelRow } from '../../domain/entities/ExcelRow';
import { SupabaseExcelRepository } from '../../adapters/SupabaseExcelRepository';
import { UploadExcel } from '../../usecases/UploadExcel';
import { GetIngestedRows } from '../../usecases/GetIngestedRows';

const excelRepository = new SupabaseExcelRepository();
const uploadExcelUseCase = new UploadExcel(excelRepository);
const getIngestedRowsUseCase = new GetIngestedRows(excelRepository);

export function useExcelProcessor() {
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [selectedFileRows, setSelectedFileRows] = useState<ExcelRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<ExcelFile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const refreshFiles = async () => {
    try {
      const allFiles = await excelRepository.getFiles();
      setFiles([...allFiles]);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lấy danh sách tệp');
    }
  };

  useEffect(() => {
    refreshFiles();
  }, []);

  useEffect(() => {
    if (!selectedFile) return;

    const unsubscribe = excelRepository.subscribeToProcessingStatus(selectedFile.id, (updatedFile) => {
      setSelectedFile(updatedFile);

      setFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === updatedFile.id ? updatedFile : f))
      );

      if (updatedFile.status === 'completed') {
        loadRows(updatedFile.id);
      }
    });

    return () => unsubscribe();
  }, [selectedFile?.id]);

  const upload = async (file: File) => {
    setLoading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const uploadedFile = await uploadExcelUseCase.execute(file, (percent) => {
        setUploadProgress(percent);
      });
      setSelectedFile(uploadedFile);
      await refreshFiles();
      return uploadedFile;
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải lên file');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadRows = async (fileId: string) => {
    try {
      const rows = await getIngestedRowsUseCase.execute(fileId);
      setSelectedFileRows(rows);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu dòng');
    }
  };

  const selectFile = async (file: ExcelFile) => {
    setSelectedFile(file);
    if (file.status === 'completed') {
      await loadRows(file.id);
    } else {
      setSelectedFileRows([]);
    }
  };

  return {
    files,
    selectedFile,
    selectedFileRows,
    loading,
    uploadProgress,
    error,
    upload,
    selectFile,
    refreshFiles,
  };
}
