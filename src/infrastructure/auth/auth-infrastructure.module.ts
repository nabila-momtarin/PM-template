import { Module } from "@nestjs/common";
import { TokenService } from "./services/token.service";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./strategies/jwt.strategy";


@Module({
    imports: [JwtModule],
    controllers: [],
    providers: [TokenService, JwtStrategy],
    exports: [TokenService]
})

export class AuthInfrastructureModule {}