import { useState, useEffect } from 'react';
import { ExcelFile } from '../../domain/entities/ExcelFile';
import { ExcelRow } from '../../domain/entities/ExcelRow';
import { ProcessingLog } from '../../domain/entities/ProcessingLog';
import { SupabaseExcelRepository } from '../../adapters/SupabaseExcelRepository';
import { UploadExcel } from '../../usecases/UploadExcel';
import { GetIngestedRowsPaginated } from '../../usecases/GetIngestedRowsPaginated';
import { UpdateRowContent } from '../../usecases/UpdateRowContent';
import { DeleteRow } from '../../usecases/DeleteRow';
import { DeleteFile } from '../../usecases/DeleteFile';
import { GetProcessingLogs } from '../../usecases/GetProcessingLogs';

const excelRepository = new SupabaseExcelRepository();
const uploadExcelUseCase = new UploadExcel(excelRepository);
const getIngestedRowsPaginatedUseCase = new GetIngestedRowsPaginated(excelRepository);
const updateRowContentUseCase = new UpdateRowContent(excelRepository);
const deleteRowUseCase = new DeleteRow(excelRepository);
const deleteFileUseCase = new DeleteFile(excelRepository);
const getProcessingLogsUseCase = new GetProcessingLogs(excelRepository);

export function useExcelProcessor() {
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [selectedFileRows, setSelectedFileRows] = useState<ExcelRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<ExcelFile | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalRows, setTotalRows] = useState<number>(0);

  // Filtering/Searching state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchColumn, setSearchColumn] = useState<string>('');

  // Logs state
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

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

  // Monitor processing file status updates
  useEffect(() => {
    if (!selectedFile) return;

    const unsubscribe = excelRepository.subscribeToProcessingStatus(selectedFile.id, (updatedFile) => {
      setSelectedFile(updatedFile);

      setFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === updatedFile.id ? updatedFile : f))
      );
    });

    return () => unsubscribe();
  }, [selectedFile?.id]);

  // Fetch paginated rows when selected file, page, page size, or search terms change
  useEffect(() => {
    if (!selectedFile) {
      setSelectedFileRows([]);
      setTotalRows(0);
      return;
    }

    if (selectedFile.status !== 'completed') {
      setSelectedFileRows([]);
      setTotalRows(0);
      return;
    }

    const loadRows = async () => {
      try {
        setLoading(true);
        const result = await getIngestedRowsPaginatedUseCase.execute(
          selectedFile.id,
          page,
          pageSize,
          searchTerm,
          searchColumn
        );
        setSelectedFileRows(result.rows);
        setTotalRows(result.totalCount);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dữ liệu dòng phân trang');
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, [selectedFile?.id, selectedFile?.status, page, pageSize, searchTerm, searchColumn]);

  // Fetch logs when file logs are requested or file status changes
  useEffect(() => {
    if (!selectedFile) {
      setLogs([]);
      return;
    }
    fetchLogs(selectedFile.id);
  }, [selectedFile?.id, selectedFile?.status]);

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

  const selectFile = async (file: ExcelFile) => {
    setPage(1);
    setSearchTerm('');
    setSearchColumn('');
    setSelectedFile(file);
  };

  const editRow = async (rowId: string, updatedContent: Record<string, any>) => {
    try {
      const updatedRow = await updateRowContentUseCase.execute(rowId, updatedContent);

      // Optimistic UI update
      setSelectedFileRows((prevRows) =>
        prevRows.map((r) => (r.id === rowId ? { ...r, content: updatedContent } : r))
      );

      return updatedRow;
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật dòng');
      throw err;
    }
  };

  const deleteRow = async (rowId: string) => {
    try {
      await deleteRowUseCase.execute(rowId);

      // Optimistic UI updates
      setSelectedFileRows((prevRows) => prevRows.filter((r) => r.id !== rowId));
      setTotalRows((prev) => Math.max(0, prev - 1));

      if (selectedFile) {
        const updatedFile: ExcelFile = {
          ...selectedFile,
          totalRows: Math.max(0, selectedFile.totalRows - 1),
          processedRows: Math.max(0, selectedFile.processedRows - 1),
        };
        setSelectedFile(updatedFile);
        setFiles((prevFiles) =>
          prevFiles.map((f) => (f.id === selectedFile.id ? updatedFile : f))
        );
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa dòng');
      throw err;
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      setLoading(true);
      await deleteFileUseCase.execute(fileId);

      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
        setSelectedFileRows([]);
        setTotalRows(0);
        setLogs([]);
      }

      await refreshFiles();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa tệp');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (fileId: string) => {
    setLogsLoading(true);
    try {
      const dbLogs = await getProcessingLogsUseCase.execute(fileId);
      setLogs(dbLogs);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải nhật ký xử lý');
    } finally {
      setLogsLoading(false);
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

    // Pagination & Filter state/methods
    page,
    setPage,
    pageSize,
    setPageSize,
    totalRows,
    searchTerm,
    setSearchTerm,
    searchColumn,
    setSearchColumn,

    // Action methods
    editRow,
    deleteRow,
    deleteFile,

    // Logs
    logs,
    logsLoading,
    fetchLogs,
  };
}
