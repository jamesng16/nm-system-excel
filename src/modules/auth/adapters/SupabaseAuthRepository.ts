import { IAuthRepository } from '../domain/repositories/IAuthRepository';
import { User } from '../domain/entities/User';

export class SupabaseAuthRepository implements IAuthRepository {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  async login(email: string, _password: string): Promise<User> {
    // Giả lập độ trễ mạng
    await new Promise((resolve) => setTimeout(resolve, 800));

    let role: 'admin' | 'guest' = 'guest';
    if (email.toLowerCase().startsWith('admin')) {
      role = 'admin';
    }

    const mockUser: User = {
      id: 'mock-user-id-' + Math.random().toString(36).substring(2, 9),
      email: email,
      role: role,
    };

    this.currentUser = mockUser;
    this.notifyListeners();
    return mockUser;
  }

  async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    this.currentUser = null;
    this.notifyListeners();
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);

    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }
}
