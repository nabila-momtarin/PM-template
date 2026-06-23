import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import * as argon2 from 'argon2';
import { TokenService } from 'src/infrastructure/auth/services/token.service';
import { UserRepository } from 'src/modules/user/repositroy/user.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
  ) { }

  private logger = new Logger(AuthService.name);

  async login(dto: LoginDto) {
    this.logger.log('SERVICE : login\n');

    try {
      const { email, password } = dto;
      this.logger.log(`Login attempt: ${email}`);

      const user = await this.userRepository.findOne({
        filters: { email },
        useLean: true,
        select: '+password name email role photo',
        populate: {
          path: 'role',
          select: 'roleName permissions',
        },
      });

      if (!user) {
        this.logger.warn(`Login failed: user not found for email ${email}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      // this.logger.log("User : ", user);
      const isPasswordMatched = await argon2.verify(user.password, password);

      if (!isPasswordMatched) {
        this.logger.warn(`Login failed: password does not match for email ${email}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      const role = user.role as any;

      const accessToken = await this.tokenService.generateAccessToken({
        sub: user._id.toString(),
        email: user.email,
        roleId: role._id.toString(),
      });

      // this.logger.debug(`Access Token : ${accessToken}`);

      const { password: _password, ...safeUser } = user;

      // this.logger.debug(`Safe User Data: ${JSON.stringify(safeUser)}`);
      this.logger.log(`Login successful: ${email}`);

      return {
        success: true,
        message: 'Login successful',
        data: {
          token: accessToken,
          user: safeUser,
        },
      };
    } catch (err) {
      this.logger.error('AuthService.login failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }
}
