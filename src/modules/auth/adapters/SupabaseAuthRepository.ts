import { IAuthRepository } from '../domain/repositories/IAuthRepository';
import { User } from '../domain/entities/User';
import { supabase } from '../../../shared/infra/supabase';

export class SupabaseAuthRepository implements IAuthRepository {
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Không tìm thấy thông tin người dùng sau khi đăng nhập.');
    }

    const metadataRole = data.user.app_metadata?.role || data.user.user_metadata?.role;
    const role: 'admin' | 'guest' = metadataRole === 'admin' ? 'admin' : 'guest';

    return {
      id: data.user.id,
      email: data.user.email || email,
      role: role,
    };
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) {
      return null;
    }

    const user = session.user;
    const metadataRole = user.app_metadata?.role || user.user_metadata?.role;
    const role: 'admin' | 'guest' = metadataRole === 'admin' ? 'admin' : 'guest';

    return {
      id: user.id,
      email: user.email || '',
      role: role,
    };
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session || !session.user) {
          callback(null);
          return;
        }

        const user = session.user;
        const metadataRole = user.app_metadata?.role || user.user_metadata?.role;
        const role: 'admin' | 'guest' = metadataRole === 'admin' ? 'admin' : 'guest';

        callback({
          id: user.id,
          email: user.email || '',
          role: role,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }
}
