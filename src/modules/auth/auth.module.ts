import { Module } from "@nestjs/common";
import { AuthController } from "./controller/auth.controller";
import { AuthService } from "./service/auth.service";
import { UserModule } from "../user/user.module";
import { AuthInfrastructureModule } from "src/infrastructure/auth/auth-infrastructure.module";


@Module({
    imports: [UserModule, AuthInfrastructureModule],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [],

})

export class AuthModule {}