import React, { useState } from 'react';

interface ReAuthModalProps {
  email: string;
  onLogin: (password: string) => Promise<void>;
  onLogout: () => void;
  isLoading: boolean;
  error: string | null;
}

export const ReAuthModal: React.FC<ReAuthModalProps> = ({
  email,
  onLogin,
  onLogout,
  isLoading,
  error,
}) => {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!password) {
      setLocalError('Vui lòng nhập mật khẩu để tiếp tục.');
      return;
    }

    try {
      await onLogin(password);
    } catch (err) {
      // Lỗi sẽ được hiển thị qua prop error
    }
  };

  const handleQuickFill = (type: 'admin' | 'guest') => {
    if (type === 'admin') {
      setPassword('admin123');
    } else {
      setPassword('guest123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-xl shadow-xl border border-gray-150 relative animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h3 className="text-lg font-bold text-gray-900">Phiên đăng nhập hết hạn</h3>
          <p className="text-sm text-gray-500 mt-1">
            Vui lòng nhập lại mật khẩu để tiếp tục bảo toàn trạng thái dữ liệu đang xử lý.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(localError || error) && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-150 font-medium">
              {localError || error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Tài khoản Email
            </label>
            <input
              type="text"
              disabled
              value={email}
              className="w-full px-3.5 py-2 border border-gray-250 bg-gray-50 text-gray-500 rounded-md text-sm cursor-not-allowed font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Nhập mật khẩu
            </label>
            <input
              type="password"
              required
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onLogout}
              className="flex-1 px-4 py-2 border border-gray-300 text-sm font-semibold rounded-md text-gray-700 hover:bg-gray-50 transition"
            >
              Đăng xuất
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md disabled:opacity-50 transition"
            >
              {isLoading ? 'Đang xác thực...' : 'Xác nhận'}
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-150 text-center">
          <span className="text-3xs text-gray-400 font-medium uppercase tracking-wider block mb-2">
            Khôi phục mật khẩu Demo
          </span>
          <div className="flex justify-center space-x-2">
            {email.includes('admin') ? (
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="text-xs px-2.5 py-1 border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-600"
              >
                Nhập nhanh mật khẩu Admin
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleQuickFill('guest')}
                className="text-xs px-2.5 py-1 border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-600"
              >
                Nhập nhanh mật khẩu Guest
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
