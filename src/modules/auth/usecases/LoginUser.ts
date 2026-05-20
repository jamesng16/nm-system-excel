import { IAuthRepository } from '../domain/repositories/IAuthRepository';
import { User } from '../domain/entities/User';

export class LoginUser {
  constructor(private authRepository: IAuthRepository) {}

  async execute(email: string, password: string): Promise<User> {
    if (!email || !email.includes('@')) {
      throw new Error('Email không hợp lệ');
    }
    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }
    return this.authRepository.login(email, password);
  }
}
