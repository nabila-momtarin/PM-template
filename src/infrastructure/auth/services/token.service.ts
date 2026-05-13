import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async generateAccessToken(payload: AccessTokenPayLoad): Promise<string> {

    const secret = this.configService.getOrThrow<string>('JWT_SECRET_KEY');
    const expiresIn = this.configService.getOrThrow<SignOptions['expiresIn']>(
      'JWT_EXPIRES_IN',
    );

    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn/* : process.env.JWT_EXPIRES_IN  *//* as StringValue */,
      // secret: 'temporary-secret',
      // expiresIn: '15m',
    });
  }

  // validateAndDecode(authorization?: string) {
  //   if (!authorization || !authorization.startsWith('Bearer ')) {
  //     throw new UnauthorizedException(
  //       'Missing or invalid authorization header',
  //     );
  //   }

  //   const token = authorization.split(' ')[1];

  //   try {
  //     return this.jwtService.verify(token) as DecodedToken;
  //   } catch (error) {
  //     throw new UnauthorizedException('Invalid or expired token');
  //   }
  // }
}

type AccessTokenPayLoad = {
  sub: string;
  email: string;
  roleId: string;
};
