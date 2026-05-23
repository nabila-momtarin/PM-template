import { forwardRef, Module } from "@nestjs/common";
import { RoleController } from "./controller/role.controller";
import { Role, RoleSchema } from "./entities/role.schema";
import { MongooseModule } from "@nestjs/mongoose";
import { RoleService } from "./service/role.service";
import { RoleRepository } from "./repositroy/role.repository";
import { UserModule } from "../user/user.module";



@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Role.name, schema: RoleSchema }
        ]),
        forwardRef(() => UserModule),
    ],
    controllers: [ RoleController ],
    providers: [ RoleService , RoleRepository],
    exports: [RoleRepository],
})

export class RoleModule {}