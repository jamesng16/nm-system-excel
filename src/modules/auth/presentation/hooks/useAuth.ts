import { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    const unsubscribe = authRepository.onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await loginUserUseCase.execute(email, password);
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
    try {
      await authRepository.logout();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi đăng xuất');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin,
  };
}
