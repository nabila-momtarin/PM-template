import { Module } from "@nestjs/common";
import { AuthController } from "./controller/auth.controller";
import { AuthService } from "./service/auth.service";
import { UserModule } from "../user/user.module";


@Module({
    imports: [UserModule],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [],

})

export class AuthModule {}