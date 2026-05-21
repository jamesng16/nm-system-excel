import React, { useRef, useState } from 'react';
import { useExcelProcessor } from '../hooks/useExcelProcessor';
import { ExcelFile } from '../../domain/entities/ExcelFile';
import { ExcelRow } from '../../domain/entities/ExcelRow';
import {
  FileSpreadsheet,
  Upload,
  Trash2,
  Edit,
  Search,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react';

interface DashboardViewProps {
  userEmail: string;
  isAdmin: boolean;
  onLogout: () => void;
  onLogin?: (email: string, password: string) => Promise<any>;
  onTriggerMockExpiration?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userEmail,
  isAdmin,
  onLogout,
  onLogin,
  onTriggerMockExpiration,
}) => {
  const {
    files,
    selectedFile,
    selectedFileRows,
    loading,
    uploadProgress,
    upload,
    selectFile,
    refreshFiles,

    // Pagination & Search
    page,
    setPage,
    pageSize,
    setPageSize,
    totalRows,
    searchTerm,
    setSearchTerm,
    searchColumn,
    setSearchColumn,

    // Actions
    editRow,
    deleteRow,
    deleteFile,

    // Logs
    logs,
    logsLoading,
    fetchLogs,
  } = useExcelProcessor();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state for search
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchColSelect, setSearchColSelect] = useState<string>('');

  // Modals / Drawers state
  const [editingRow, setEditingRow] = useState<ExcelRow | null>(null);
  const [editFormContent, setEditFormContent] = useState<Record<string, any>>({});
  const [deletingRow, setDeletingRow] = useState<ExcelRow | null>(null);
  const [deletingFile, setDeletingFile] = useState<ExcelFile | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [showLogsDrawer, setShowLogsDrawer] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // States for Login Modal
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail) {
      setLoginError('Vui lòng nhập địa chỉ email');
      return;
    }
    if (!loginPassword) {
      setLoginError('Vui lòng nhập mật khẩu');
      return;
    }

    setLoginLoading(true);
    try {
      if (onLogin) {
        await onLogin(loginEmail, loginPassword);
        setShowLoginModal(false);
        setLoginEmail('');
        setLoginPassword('');
        showToast('Đăng nhập thành công!', 'success');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Sai tài khoản hoặc mật khẩu');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleFillQuickLogin = (type: 'admin' | 'guest') => {
    if (type === 'admin') {
      setLoginEmail('admin@hcs.com');
      setLoginPassword('admin123');
    } else {
      setLoginEmail('guest@hcs.com');
      setLoginPassword('guest123');
    }
  };

  // File Change handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      setActionError(null);
      setActionSuccess(null);
      await upload(fileList[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showToast('Tải lên file thành công. Tiến trình xử lý đã được kích hoạt bất đồng bộ.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải lên tệp tin', 'error');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAdmin || loading) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      try {
        setActionError(null);
        setActionSuccess(null);
        await upload(droppedFiles[0]);
        showToast('Kéo thả file thành công. Tiến trình xử lý đã được kích hoạt bất đồng bộ.', 'success');
      } catch (err: any) {
        showToast(err.message || 'Lỗi tải lên tệp tin', 'error');
      }
    }
  };

  // Toast message helpers
  const showToast = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 5000);
    } else {
      setActionError(msg);
      setTimeout(() => setActionError(null), 7000);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Search logic
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput);
    setSearchColumn(searchColSelect);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchColSelect('');
    setPage(1);
    setSearchTerm('');
    setSearchColumn('');
  };

  // Paginated range display
  const startRowIndex = (page - 1) * pageSize + 1;
  const endRowIndex = Math.min(page * pageSize, totalRows);
  const totalPages = Math.ceil(totalRows / pageSize) || 1;

  // Edit form handlers
  const openEditModal = (row: ExcelRow) => {
    setEditingRow(row);
    setEditFormContent({ ...row.content });
  };

  const handleEditFormChange = (key: string, value: any) => {
    setEditFormContent((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveEditedRow = async () => {
    if (!editingRow) return;
    try {
      await editRow(editingRow.id, editFormContent);
      setEditingRow(null);
      showToast('Cập nhật dòng dữ liệu thành công.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi cập nhật dòng', 'error');
    }
  };

  // Row Delete handlers
  const handleConfirmDeleteRow = async () => {
    if (!deletingRow) return;
    try {
      await deleteRow(deletingRow.id);
      setDeletingRow(null);
      showToast('Xóa dòng dữ liệu thành công.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa dòng dữ liệu', 'error');
    }
  };

  // File Delete handlers
  const handleConfirmDeleteFile = async () => {
    if (!deletingFile) return;
    try {
      await deleteFile(deletingFile.id);
      setDeletingFile(null);
      showToast('Xóa tệp tin và toàn bộ dữ liệu thành công.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa tệp tin', 'error');
    }
  };

  // Dynamic columns detection from first row
  const rowHeaders = selectedFileRows.length > 0 ? Object.keys(selectedFileRows[0].content) : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Excel Ingestion Manager</h1>
            <p className="text-xs text-gray-500">Môi trường xử lý Excel & Hình ảnh bất đồng bộ</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-700">{userEmail}</div>
            <div className="text-xs">
              Quyền hạn:{' '}
              {userEmail !== 'Guest (Ẩn danh - Chỉ đọc)' && isAdmin ? (
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                  Admin (Ghi/Sửa)
                </span>
              ) : (
                <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                  Guest (Chỉ đọc)
                </span>
              )}
            </div>
          </div>
          {onTriggerMockExpiration && userEmail !== 'Guest (Ẩn danh - Chỉ đọc)' && (
            <button
              onClick={onTriggerMockExpiration}
              className="text-xs text-amber-600 hover:text-amber-800 border border-amber-250 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition font-medium"
            >
              Simulate Expired
            </button>
          )}
          {userEmail !== 'Guest (Ẩn danh - Chỉ đọc)' ? (
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 text-sm text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3.5 py-1.5 rounded-lg transition font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center space-x-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition font-medium shadow-xs"
            >
              <span>Đăng nhập Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

        {/* Left Side: Operations & Files list */}
        <div className="lg:col-span-1 space-y-6 flex flex-col min-h-0">

          {/* Upload File Panel */}
          {isAdmin && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center space-x-2">
                <Upload className="h-5 w-5 text-blue-500" />
                <span>Tải lên tệp Excel</span>
              </h2>
              <div className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !loading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer hover:bg-blue-50/20 transition-all ${
                    loading ? 'pointer-events-none opacity-50 bg-gray-50' : ''
                  }`}
                >
                  <div className="bg-blue-50 text-blue-500 p-3 rounded-full w-12 h-12 mx-auto flex items-center justify-center mb-3">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Kéo & thả file ở đây</p>
                  <p className="text-xs text-gray-400 mt-1">hoặc nhấn để duyệt file từ máy</p>
                  <p className="text-3xs text-gray-400 mt-2 italic">Chấp nhận .xlsx, .xls nặng tới 200MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </div>

                {loading && uploadProgress < 100 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-600 font-semibold">
                      <span>Đang truyền tệp tin lên Storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Files List Panel */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex-1 flex flex-col min-h-0">
            <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center justify-between">
              <span>Lịch sử tệp tin ({files.length})</span>
              <button
                onClick={() => {
                  refreshFiles();
                  if (selectedFile) fetchLogs(selectedFile.id);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-50 rounded-lg transition"
                title="Làm mới danh sách"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px]">
              {files.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm flex flex-col items-center">
                  <FileSpreadsheet className="h-10 w-10 text-gray-300 mb-2" />
                  <p>Chưa có tệp tin nào</p>
                </div>
              ) : (
                files.map((file) => {
                  const isSelected = selectedFile?.id === file.id;
                  const progressPct =
                    file.totalRows > 0 ? Math.round((file.processedRows / file.totalRows) * 100) : 0;
                  return (
                    <div
                      key={file.id}
                      onClick={() => selectFile(file)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative group ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3
                          className="text-xs font-bold text-gray-800 truncate pr-6"
                          title={file.name}
                        >
                          {file.name}
                        </h3>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingFile(file);
                            }}
                            className="absolute right-2 top-2 p-1 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Xóa tệp tin"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-3xs text-gray-400 mb-2 font-medium">
                        <span>{formatBytes(file.size)}</span>
                        <span>•</span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-4xs ${
                            file.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : file.status === 'processing'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100 animate-pulse'
                              : file.status === 'failed'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {file.status === 'completed'
                            ? 'Hoàn thành'
                            : file.status === 'processing'
                            ? 'Đang xử lý'
                            : file.status === 'failed'
                            ? 'Thất bại'
                            : 'Chờ xử lý'}
                        </span>
                      </div>

                      {/* Sub-progress status */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-4xs text-gray-500 font-semibold">
                          <span>Tiến độ dòng:</span>
                          <span>
                            {file.processedRows}/{file.totalRows} ({progressPct}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              file.status === 'failed' ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Data Grid & Actions */}
        <div className="lg:col-span-3 flex flex-col bg-white p-5 rounded-xl border border-gray-200 shadow-xs min-h-0">

          {/* Action Toasts */}
          {actionSuccess && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-fadeIn shadow-xs">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {actionError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-800 text-xs font-semibold flex items-center space-x-2 animate-fadeIn shadow-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Grid Panel View */}
          {!selectedFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-20 bg-gray-50/40 rounded-xl border border-dashed border-gray-200">
              <FileSpreadsheet className="h-16 w-16 text-gray-300 mb-3" />
              <h3 className="text-base font-bold text-gray-700">Chưa chọn tệp tin</h3>
              <p className="text-xs text-gray-400 max-w-[280px] text-center mt-1">
                Chọn một tệp Excel trong lịch sử bên trái để duyệt, chỉnh sửa hoặc kiểm tra logs lỗi.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">

              {/* Selected File Details Panel */}
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-150 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-800 truncate max-w-[320px]">
                    {selectedFile.name}
                  </h3>
                  <div className="flex items-center space-x-3 text-3xs text-gray-500 mt-1 font-medium">
                    <span>ID: {selectedFile.id}</span>
                    <span>•</span>
                    <span>Khởi tạo: {selectedFile.createdAt ? new Date(selectedFile.createdAt).toLocaleString() : ''}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedFile.status === 'failed' && (
                    <button
                      onClick={() => setShowLogsDrawer(true)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg border border-red-200 text-3xs font-extrabold transition"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>Xem Nhật Ký Lỗi</span>
                    </button>
                  )}
                  {selectedFile.status === 'completed' && (
                    <button
                      onClick={() => setShowLogsDrawer(true)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-250 rounded-lg border border-gray-200 text-3xs font-extrabold transition"
                    >
                      <Info className="h-3 w-3" />
                      <span>Xem Log Tiến Trình</span>
                    </button>
                  )}
                  <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-3xs">
                    {totalRows} Dòng dữ liệu
                  </span>
                </div>
              </div>

              {/* Status Pending or Processing */}
              {selectedFile.status !== 'completed' && selectedFile.status !== 'failed' ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <div className="animate-spin text-blue-500 p-2 bg-blue-50 rounded-full mb-3">
                    <RefreshCw className="h-8 w-8 animate-reverse-spin" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-700">Tệp Excel đang được xử lý phía Server</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-[320px] text-center">
                    Edge Service đang đọc stream và thực hiện bulk insert Postgres...
                  </p>
                  <div className="mt-4 flex items-center space-x-2 bg-blue-50 text-blue-700 border border-blue-100 px-4 py-1.5 rounded-lg text-xs font-extrabold">
                    <span>Đang xử lý: {selectedFile.processedRows} dòng</span>
                  </div>
                </div>
              ) : selectedFile.status === 'failed' ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-red-500 bg-red-50/20 rounded-xl border border-dashed border-red-200 px-4">
                  <div className="bg-red-50 p-3 rounded-full text-red-500 mb-3 border border-red-150">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <h4 className="text-sm font-bold text-red-800">Xử lý tệp Excel thất bại</h4>
                  <p className="text-xs text-red-600 mt-1 max-w-[480px] text-center font-medium bg-white p-3 rounded-lg border border-red-100 shadow-3xs">
                    Chi tiết lỗi: {selectedFile.errorLog || 'Lỗi parser không xác định.'}
                  </p>
                  <button
                    onClick={() => setShowLogsDrawer(true)}
                    className="mt-4 flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Mở Bảng Log Chi Tiết Để Kiểm Tra</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">

                  {/* Search and Filters Section */}
                  <form onSubmit={handleSearchSubmit} className="bg-white border border-gray-200 p-3.5 rounded-xl mb-4 shadow-3xs flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm dòng dữ liệu văn bản..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-gray-200 focus:border-blue-500 focus:outline-none rounded-lg text-xs transition"
                        />
                      </div>
                      <select
                        value={searchColSelect}
                        onChange={(e) => setSearchColSelect(e.target.value)}
                        className="border border-gray-200 rounded-lg text-xs px-3 focus:outline-none focus:border-blue-500 bg-gray-50 font-medium"
                      >
                        <option value="">Tất cả các cột</option>
                        {rowHeaders.map((hdr) => (
                          <option key={hdr} value={hdr}>
                            {hdr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition shadow-xs"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>Tìm kiếm</span>
                      </button>
                      {(searchTerm || searchColumn || searchInput) && (
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-lg transition"
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Empty Result */}
                  {selectedFileRows.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-16 bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
                      <Search className="h-10 w-10 text-gray-300 mb-2" />
                      <h5 className="text-xs font-bold text-gray-700">Không tìm thấy kết quả</h5>
                      <p className="text-4xs text-gray-400 mt-0.5">Thử đổi từ khóa hoặc cột tìm kiếm khác</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Grid Table Container */}
                      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-3xs max-w-full">
                        <table className="min-w-full divide-y divide-gray-200 text-xs table-fixed">
                          <thead className="bg-gray-50 sticky top-0 z-2">
                            <tr>
                              <th className="px-4 py-3.5 text-left text-4xs font-black text-gray-500 uppercase tracking-wider w-16 bg-gray-50 border-b border-gray-200">
                                STT
                              </th>
                              <th className="px-4 py-3.5 text-left text-4xs font-black text-gray-500 uppercase tracking-wider w-32 bg-gray-50 border-b border-gray-200">
                                Hình ảnh
                              </th>
                              {rowHeaders.map((hdr) => (
                                <th
                                  key={hdr}
                                  className="px-4 py-3.5 text-left text-4xs font-black text-gray-500 uppercase tracking-wider w-48 bg-gray-50 border-b border-gray-200 truncate"
                                  title={hdr}
                                >
                                  {hdr}
                                </th>
                              ))}
                              {isAdmin && (
                                <th className="px-4 py-3.5 text-center text-4xs font-black text-gray-500 uppercase tracking-wider w-28 bg-gray-50 border-b border-gray-200 sticky right-0 z-2 shadow-left">
                                  Thao tác
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-150">
                            {selectedFileRows.map((row) => (
                              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 text-gray-500 font-bold">{row.rowIndex}</td>

                                {/* Image Column */}
                                <td className="px-4 py-3">
                                  {row.images && row.images.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {row.images.map((img) => (
                                        <div
                                          key={img.id}
                                          onClick={() => setPreviewImage({ url: img.publicUrl || '', name: img.originalName })}
                                          className="relative group w-8 h-8 rounded-md border border-gray-200 overflow-hidden cursor-zoom-in hover:border-blue-400 transition"
                                          title={`Xem ảnh: ${img.originalName}`}
                                        >
                                          <img
                                            src={img.publicUrl}
                                            alt={img.originalName}
                                            className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                                            onError={(e) => {
                                              (e.target as HTMLElement).style.display = 'none';
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition duration-200" />
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 text-3xs font-medium italic">Không có ảnh</span>
                                  )}
                                </td>

                                {/* Text Data Cells */}
                                {rowHeaders.map((hdr) => {
                                  const cellVal = row.content[hdr];
                                  return (
                                    <td
                                      key={hdr}
                                      className="px-4 py-3 text-gray-800 truncate font-medium"
                                      title={String(cellVal ?? '')}
                                    >
                                      {cellVal !== undefined && cellVal !== null ? String(cellVal) : '-'}
                                    </td>
                                  );
                                })}

                                {/* Admin Action Buttons */}
                                {isAdmin && (
                                  <td className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-gray-50/50 z-2 shadow-left border-l border-gray-100">
                                    <div className="flex items-center justify-center space-x-1">
                                      <button
                                        onClick={() => openEditModal(row)}
                                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                        title="Chỉnh sửa dòng"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setDeletingRow(row)}
                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                        title="Xóa dòng"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-3xs">
                        <div className="text-xs text-gray-600 font-semibold">
                          Hiển thị <span className="text-gray-800 font-extrabold">{startRowIndex}</span> đến{' '}
                          <span className="text-gray-800 font-extrabold">{endRowIndex}</span> trong tổng số{' '}
                          <span className="text-gray-800 font-extrabold">{totalRows}</span> dòng
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-3xs text-gray-500 font-bold uppercase tracking-wider">Hiển thị:</span>
                            <select
                              value={pageSize}
                              onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                              }}
                              className="border border-gray-200 rounded-lg text-3xs font-extrabold bg-white px-2.5 py-1 focus:outline-none focus:border-blue-500"
                            >
                              <option value={5}>5 dòng</option>
                              <option value={10}>10 dòng</option>
                              <option value={25}>25 dòng</option>
                              <option value={50}>50 dòng</option>
                              <option value={100}>100 dòng</option>
                            </select>
                          </div>

                          {/* Nav Pages */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="p-1.5 border border-gray-200 hover:border-gray-300 rounded-lg bg-white disabled:opacity-40 disabled:hover:border-gray-200 transition"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
                              Trang {page} / {totalPages}
                            </span>
                            <button
                              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                              disabled={page === totalPages}
                              className="p-1.5 border border-gray-200 hover:border-gray-300 rounded-lg bg-white disabled:opacity-40 disabled:hover:border-gray-200 transition"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* EDIT MODAL DIALOG */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-150 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-sm font-bold text-gray-800 flex items-center space-x-2">
                <Edit className="h-4.5 w-4.5 text-blue-500" />
                <span>Chỉnh sửa dòng {editingRow.rowIndex}</span>
              </h3>
              <button
                onClick={() => setEditingRow(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {Object.keys(editFormContent).map((key) => (
                <div key={key} className="space-y-1.5">
                  <label className="block text-3xs font-extrabold text-gray-600 uppercase tracking-wider">
                    {key}
                  </label>
                  <input
                    type="text"
                    value={editFormContent[key] !== null ? String(editFormContent[key]) : ''}
                    onChange={(e) => handleEditFormChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 focus:outline-none rounded-lg text-xs transition"
                  />
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-150 bg-gray-50 flex justify-end space-x-2 rounded-b-xl">
              <button
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={saveEditedRow}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ROW MODAL */}
      {deletingRow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-gray-200">
            <div className="p-5 text-center">
              <div className="bg-red-50 text-red-500 p-3 rounded-full w-12 h-12 mx-auto flex items-center justify-center mb-3">
                <Trash2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 mb-2">Xác nhận xóa dòng?</h4>
              <p className="text-xs text-gray-400">
                Bạn có chắc chắn muốn xóa dòng số <strong className="text-gray-700 font-extrabold">{deletingRow.rowIndex}</strong>?
                Mọi hình ảnh đính kèm liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống lưu trữ.
              </p>
            </div>
            <div className="px-4 py-3.5 bg-gray-50 border-t border-gray-150 flex justify-end space-x-2 rounded-b-xl">
              <button
                onClick={() => setDeletingRow(null)}
                className="px-3.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDeleteRow}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE FILE MODAL */}
      {deletingFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-200">
            <div className="p-5">
              <div className="bg-red-50 text-red-500 p-3 rounded-full w-12 h-12 mx-auto flex items-center justify-center mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 text-center mb-2">Xác nhận xóa tệp tin?</h4>
              <p className="text-xs text-gray-400 text-center">
                Bạn đang thực hiện xóa tệp <strong className="text-gray-700 font-extrabold">{deletingFile.name}</strong>.
              </p>
              <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3 text-red-700 text-3xs font-semibold leading-relaxed">
                Hành động này sẽ xóa vĩnh viễn:
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>Bản ghi file trong database</li>
                  <li>Tất cả dòng dữ liệu văn bản đã trích xuất</li>
                  <li>Tệp Excel gốc lưu trong Storage</li>
                  <li>Tất cả hình ảnh đã giải nén tương ứng trong Storage</li>
                </ul>
              </div>
            </div>
            <div className="px-4 py-3.5 bg-gray-50 border-t border-gray-150 flex justify-end space-x-2 rounded-b-xl">
              <button
                onClick={() => setDeletingFile(null)}
                className="px-3.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDeleteFile}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                Xác nhận xóa sạch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-3xs" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl w-full flex flex-col bg-black rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition z-10"
              title="Đóng xem thử"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-2 flex items-center justify-center min-h-[300px]">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[80vh] object-contain max-w-full rounded-md"
              />
            </div>
            <div className="bg-gray-900/90 text-white text-3xs px-4 py-2.5 flex justify-between items-center border-t border-gray-800">
              <span className="font-semibold truncate max-w-[280px]" title={previewImage.name}>
                Tên ảnh: {previewImage.name}
              </span>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-4xs font-bold transition"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Mở trong tab mới</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* PROCESSING LOGS DRAWER (UI-04) */}
      {showLogsDrawer && selectedFile && (
        <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-3xs flex justify-end" onClick={() => setShowLogsDrawer(false)}>
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-gray-200 animate-slideLeft" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-150 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center space-x-2">
                  <Info className="h-4.5 w-4.5 text-blue-500" />
                  <span>Nhật ký xử lý hệ thống</span>
                </h3>
                <p className="text-4xs text-gray-500 mt-0.5 max-w-[280px] truncate" title={selectedFile.name}>
                  File: {selectedFile.name}
                </p>
              </div>
              <button
                onClick={() => setShowLogsDrawer(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Logs Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/50">
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-xs">Đang tải logs từ Database...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-xs">
                  <Info className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p>Không có nhật ký nào được ghi nhận cho file này.</p>
                </div>
              ) : (
                logs.map((log) => {
                  let badgeClass = '';
                  let icon = null;

                  if (log.level === 'error') {
                    badgeClass = 'bg-red-50 text-red-700 border-red-150';
                    icon = <AlertCircle className="h-3.5 w-3.5 shrink-0" />;
                  } else if (log.level === 'warning') {
                    badgeClass = 'bg-amber-50 text-amber-700 border-amber-150';
                    icon = <AlertTriangle className="h-3.5 w-3.5 shrink-0" />;
                  } else {
                    badgeClass = 'bg-blue-50 text-blue-700 border-blue-150';
                    icon = <Info className="h-3.5 w-3.5 shrink-0" />;
                  }

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg border bg-white shadow-3xs flex items-start space-x-2.5 transition ${
                        log.level === 'error' ? 'border-red-100 hover:border-red-200' : 'border-gray-250 hover:border-gray-200'
                      }`}
                    >
                      <div className={`p-1 rounded-md border ${badgeClass}`}>
                        {icon}
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 break-words leading-relaxed">
                          {log.message}
                        </p>
                        <p className="text-4xs text-gray-400 font-bold uppercase tracking-wider">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-150 bg-gray-50 flex justify-between items-center">
              <span className="text-4xs text-gray-400 font-bold uppercase tracking-wider">
                Tổng cộng: {logs.length} logs
              </span>
              <button
                onClick={() => fetchLogs(selectedFile.id)}
                disabled={logsLoading}
                className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg text-3xs font-extrabold text-gray-700 transition"
              >
                <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới logs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL (When guest wants to authenticate as Admin) */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-2xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-200 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-150 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="text-sm font-bold text-gray-800 flex items-center space-x-2">
                <FileSpreadsheet className="h-4.5 w-4.5 text-blue-500" />
                <span>Đăng nhập hệ thống</span>
              </h3>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginError(null);
                }}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              {loginError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-150 font-medium">
                  {loginError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-3xs font-extrabold text-gray-600 uppercase tracking-wider">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    placeholder="admin@hcs.com hoặc guest@hcs.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 focus:outline-none rounded-lg text-xs transition"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-3xs font-extrabold text-gray-600 uppercase tracking-wider">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 focus:outline-none rounded-lg text-xs transition"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </div>
            </form>

            <div className="px-6 pb-6 pt-4 border-t border-gray-150 bg-gray-50 rounded-b-xl">
              <div className="text-3xs font-extrabold text-gray-500 uppercase tracking-wider mb-2.5">
                Tài khoản dùng thử (Demo Accounts):
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleFillQuickLogin('admin')}
                  className="flex-1 py-1.5 px-3 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-3xs font-bold rounded-lg transition"
                >
                  Admin (Ghi/Sửa)
                </button>
                <button
                  type="button"
                  onClick={() => handleFillQuickLogin('guest')}
                  className="flex-1 py-1.5 px-3 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-3xs font-bold rounded-lg transition"
                >
                  Guest (Chỉ đọc)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
