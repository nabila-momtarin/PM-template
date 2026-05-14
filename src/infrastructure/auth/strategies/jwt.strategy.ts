import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export type JwtPayload = {
    sub: string;
    email: string;
    roleId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor( private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET_KEY'),
            ignoreExpiration: false,
        });
    }

    private logger = new Logger(JwtStrategy.name);
    async validate( payload: JwtPayload) {

        this.logger.debug('JWT payload:', payload);
        return {
            userId: payload.sub,
            email: payload.email,
            roleId: payload.roleId
        };
    }
}