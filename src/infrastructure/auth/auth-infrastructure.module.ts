import { Module } from "@nestjs/common";
import { TokenService } from "./services/token.service";
import { JwtModule } from "@nestjs/jwt";


@Module({
    imports: [JwtModule],
    controllers: [],
    providers: [TokenService],
    exports: [TokenService]
})

export class AuthInfrastructureModule {}