import { Module } from "@nestjs/common";
import { RoleController } from "./controller/role.controller";
import { Role, RoleSchema } from "./entities/role.schema";
import { MongooseModule } from "@nestjs/mongoose";
import { RoleService } from "./service/role.service";
import { RoleRepository } from "./repositroy/role.repository";



@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Role.name, schema: RoleSchema }
        ]),
    ],
    controllers: [ RoleController ],
    providers: [ RoleService , RoleRepository],
    exports: [RoleRepository],
})

export class RoleModule {}