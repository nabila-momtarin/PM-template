import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { DecodedToken } from '../types/auth.types';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  validateAndDecode(authorization?: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    const token = authorization.split(' ')[1];

    try {
      return this.jwtService.verify(token) as DecodedToken;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
