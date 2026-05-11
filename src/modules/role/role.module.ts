import { Module } from "@nestjs/common";
import { RoleController } from "./http/role.controller";
import { RoleService } from "./role.service";
import { RoleRepository } from "./role.repository";
import { Role, RoleSchema } from "./entities/role.schema";
import { MongooseModule } from "@nestjs/mongoose";



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