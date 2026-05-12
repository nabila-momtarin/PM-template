import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { UserRepository } from 'src/modules/user/user.repository';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  private logger = new Logger(AuthService.name);

  async login(dto: LoginDto) {
    this.logger.log('SERVICE : login\n');

    const { email, password } = dto;
    this.logger.log(`Login attempt: ${email}`);

    const user = await this.userRepository.findOne({
      filters: { email },
      useLean: true,
     select: '+password name email role',
      populate: {
        path: 'role',
        select: 'roleName permissions',
      }
    });

    if (!user) {
      this.logger.warn(`Login failed: user not found for email ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatched = await argon2.verify(user.password , password);

    if (!isPasswordMatched) {
      this.logger.warn(`Login failed: password does not match for email ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password: _password, ...safeUser } = user;

    this.logger.log(`Login successful: ${email}`);

    return {
      success: true,
      message: 'Login successful',
      data: {
        token: 'dummy token',
        user: safeUser, 
      },
    };
  }
}
