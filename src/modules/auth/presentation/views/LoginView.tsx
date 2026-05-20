import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email) {
      setValidationError('Vui lòng nhập email');
      return;
    }
    if (!password) {
      setValidationError('Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 6) {
      setValidationError('Mật khẩu phải chứa ít nhất 6 ký tự');
      return;
    }

    try {
      await login(email, password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      // Lỗi đã được lưu trong useAuth
    }
  };

  const handleFillCredentials = (type: 'admin' | 'guest') => {
    if (type === 'admin') {
      setEmail('admin@hcs.com');
      setPassword('admin123');
    } else {
      setEmail('guest@hcs.com');
      setPassword('guest123');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div>
          <div className="flex justify-center text-4xl">📊</div>
          <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
            Excel Processor System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Đăng nhập tài khoản của bạn để tiếp tục
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {validationError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-150">
              {validationError}
            </div>
          )}
          {authError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-150">
              {authError}
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                Địa chỉ Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="admin@hcs.com hoặc guest@hcs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-150">
          <div className="text-sm font-medium text-gray-500 mb-2">Đăng nhập nhanh (Quick Demo Account):</div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleFillCredentials('admin')}
              className="flex-1 text-xs py-2 px-3 border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 transition"
            >
              Tài khoản Admin
            </button>
            <button
              onClick={() => handleFillCredentials('guest')}
              className="flex-1 text-xs py-2 px-3 border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 transition"
            >
              Tài khoản Guest
            </button>
          </div>
          <p className="mt-2 text-2xs text-gray-400 italic">
            * Admin có quyền Upload & xem dữ liệu. Guest chỉ có quyền xem dữ liệu.
          </p>
        </div>
      </div>
    </div>
  );
};
