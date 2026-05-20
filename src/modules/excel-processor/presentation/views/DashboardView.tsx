import React, { useRef } from 'react';
import { useExcelProcessor } from '../hooks/useExcelProcessor';

interface DashboardViewProps {
  userEmail: string;
  isAdmin: boolean;
  onLogout: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userEmail,
  isAdmin,
  onLogout,
}) => {
  const {
    files,
    selectedFile,
    selectedFileRows,
    loading,
    uploadProgress,
    error,
    upload,
    selectFile,
  } = useExcelProcessor();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      await upload(fileList[0]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      // Báo lỗi đã được handle bởi hook
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
        await upload(droppedFiles[0]);
      } catch (err) {
        // Báo lỗi đã được handle bởi hook
      }
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📊</span>
          <h1 className="text-xl font-bold text-gray-900">Excel Processor Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-700">{userEmail}</div>
            <div className="text-xs text-gray-500">
              Quyền hạn: {isAdmin ? (
                <span className="text-green-600 font-bold">Admin (Ghi/Sửa)</span>
              ) : (
                <span className="text-blue-600 font-bold">Guest (Chỉ đọc)</span>
              )}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded transition"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Upload & Files List */}
        <div className="md:col-span-1 space-y-6">
          {/* Section 1: Upload File */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Tải lên tệp Excel mới</h2>

            {!isAdmin ? (
              <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-200">
                Tài khoản của bạn là <strong>Guest (Chỉ đọc)</strong>. Vui lòng đăng nhập bằng tài khoản <strong>Admin</strong> để tải lên tệp tin.
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition ${
                    loading ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <span className="text-3xl block mb-2">📁</span>
                  <p className="text-sm font-medium text-gray-700">Kéo & thả file ở đây</p>
                  <p className="text-xs text-gray-400 mt-1">hoặc nhấn để chọn tệp từ máy tính</p>
                  <p className="text-3xs text-gray-400 mt-2">Hỗ trợ Excel (.xlsx, .xls) lên tới 200MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </div>

                {loading && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-600 font-medium">
                      <span>Đang tải file lên...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Files History */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col h-[400px]">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Danh sách tệp tin</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {files.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Chưa có tệp tin nào được tải lên
                </div>
              ) : (
                files.map((file) => {
                  const isSelected = selectedFile?.id === file.id;
                  return (
                    <div
                      key={file.id}
                      onClick={() => selectFile(file)}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-semibold text-gray-800 truncate max-w-[150px]">
                          {file.name}
                        </h3>
                        <span
                          className={`text-3xs px-2 py-0.5 rounded font-bold uppercase ${
                            file.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : file.status === 'processing'
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : file.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
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
                      <div className="text-3xs text-gray-400 mt-1">
                        Dung lượng: {formatBytes(file.size)}
                      </div>
                      <div className="mt-2.5">
                        <div className="flex justify-between text-3xs text-gray-500 mb-1">
                          <span>Tiến độ xử lý dòng</span>
                          <span>
                            {file.processedRows}/{file.totalRows}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              file.status === 'failed' ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{
                              width: `${
                                file.totalRows > 0
                                  ? (file.processedRows / file.totalRows) * 100
                                  : 0
                              }%`,
                            }}
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

        {/* Right Side: Data Grid Viewer */}
        <div className="md:col-span-2 flex flex-col bg-white p-6 rounded-xl border border-gray-200 shadow-xs h-[592px]">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Chi tiết dữ liệu Excel trích xuất</h2>

          {!selectedFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-2">📋</span>
              <p className="text-sm">Vui lòng chọn một tệp tin bên danh sách để xem dữ liệu</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-150 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{selectedFile.name}</h3>
                  <p className="text-3xs text-gray-500">
                    ID: {selectedFile.id} | Dòng: {selectedFile.totalRows} dòng
                  </p>
                </div>
                <div className="text-xs">
                  Trạng thái: <strong className="capitalize">{selectedFile.status}</strong>
                </div>
              </div>

              {selectedFile.status !== 'completed' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                  <div className="animate-spin text-3xl mb-2">⏳</div>
                  <p className="text-sm font-medium">Tệp Excel đang được xử lý phía server...</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tiến độ: {selectedFile.processedRows} / {selectedFile.totalRows} dòng
                  </p>
                </div>
              ) : selectedFileRows.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  Không có dữ liệu dòng nào được hiển thị
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">
                            STT
                          </th>
                          {Object.keys(selectedFileRows[0].content).map((key) => (
                            <th
                              key={key}
                              className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedFileRows.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500 font-medium">{row.rowIndex}</td>
                            {Object.values(row.content).map((value, idx) => (
                              <td key={idx} className="px-4 py-3 text-gray-900 whitespace-nowrap">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-2xs text-gray-400 mt-2 italic">
                    * Đang hiển thị tối đa 15 dòng dữ liệu đầu tiên (Dữ liệu Mock phía Adapter).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
