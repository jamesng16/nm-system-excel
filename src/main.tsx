import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { useAuth } from './modules/auth/presentation/hooks/useAuth';
import { DashboardView } from './modules/excel-processor/presentation/views/DashboardView';
import { ReAuthModal } from './modules/auth/presentation/components/ReAuthModal';

const App: React.FC = () => {
  const {
    user,
    loading,
    logout,
    isAdmin,
    isSessionExpired,
    expiredEmail,
    login,
    error: authError,
    triggerMockSessionExpiration,
  } = useAuth();

  if (loading && !isSessionExpired && user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Đang tải cấu hình ứng dụng...</p>
        </div>
      </div>
    );
  }

  const handleReAuth = async (password: string) => {
    if (expiredEmail) {
      await login(expiredEmail, password);
    }
  };

  return (
    <>
      <DashboardView
        userEmail={user ? user.email : 'Guest (Ẩn danh - Chỉ đọc)'}
        isAdmin={isAdmin}
        onLogout={logout}
        onLogin={login}
        onTriggerMockExpiration={user ? triggerMockSessionExpiration : undefined}
      />

      {isSessionExpired && expiredEmail && (
        <ReAuthModal
          email={expiredEmail}
          onLogin={handleReAuth}
          onLogout={logout}
          isLoading={loading}
          error={authError}
        />
      )}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
