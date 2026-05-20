import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { useAuth } from './modules/auth/presentation/hooks/useAuth';
import { LoginView } from './modules/auth/presentation/views/LoginView';
import { DashboardView } from './modules/excel-processor/presentation/views/DashboardView';

const App: React.FC = () => {
  const { user, loading, logout, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Đang tải cấu hình ứng dụng...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <DashboardView
      userEmail={user.email}
      isAdmin={isAdmin}
      onLogout={logout}
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
