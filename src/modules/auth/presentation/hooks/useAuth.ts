import { useState, useEffect, useMemo, useRef } from 'react';
import { User } from '../../domain/entities/User';
import { SupabaseAuthRepository } from '../../adapters/SupabaseAuthRepository';
import { LoginUser } from '../../usecases/LoginUser';

// Khởi tạo instance duy nhất (Singleton-like cho presentation layer)
const authRepository = new SupabaseAuthRepository();
const loginUserUseCase = new LoginUser(authRepository);

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  const [expiredEmail, setExpiredEmail] = useState<string | null>(null);

  const isLoggingOut = useRef<boolean>(false);
  const prevUser = useRef<User | null>(null);

  useEffect(() => {
    prevUser.current = user;
  }, [user]);

  useEffect(() => {
    const unsubscribe = authRepository.onAuthStateChange((currentUser) => {
      if (currentUser === null) {
        // Nếu session bị mất
        if (isLoggingOut.current) {
          // Người dùng chủ động đăng xuất
          setUser(null);
          setIsSessionExpired(false);
          setExpiredEmail(null);
        } else if (prevUser.current !== null) {
          // Token hết hạn đột ngột (trước đó đã có user đăng nhập)
          setIsSessionExpired(true);
          setExpiredEmail(prevUser.current.email);
          // Giữ nguyên `user` trong state để Dashboard không bị ẩn đi
        } else {
          // Lần đầu load trang chưa đăng nhập
          setUser(null);
          setIsSessionExpired(false);
          setExpiredEmail(null);
        }
      } else {
        // Session hợp lệ hoặc mới đăng nhập thành công
        setUser(currentUser);
        setIsSessionExpired(false);
        setExpiredEmail(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await loginUserUseCase.execute(email, password);
      setIsSessionExpired(false);
      setExpiredEmail(null);
      return loggedInUser;
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi đăng nhập');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    isLoggingOut.current = true;
    try {
      await authRepository.logout();
      setUser(null);
      setIsSessionExpired(false);
      setExpiredEmail(null);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi đăng xuất');
      throw err;
    } finally {
      setLoggingOutFalse();
      setLoading(false);
    }
  };

  const setLoggingOutFalse = () => {
    // Trì hoãn việc reset cờ logging out để sự kiện onAuthStateChange nhận diện đúng
    setTimeout(() => {
      isLoggingOut.current = false;
    }, 100);
  };

  const triggerMockSessionExpiration = () => {
    // Phương thức kiểm thử: mô phỏng việc session hết hạn ngẫu nhiên
    if (user) {
      setIsSessionExpired(true);
      setExpiredEmail(user.email);
    }
  };

  const clearSessionExpired = () => {
    setIsSessionExpired(false);
  };

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin,
    isSessionExpired,
    expiredEmail,
    clearSessionExpired,
    triggerMockSessionExpiration,
  };
}
