import { Module } from "@nestjs/common";
import { PermissionService } from "./permission.service";
import { PermissionController } from "./controller/permission.controller";



@Module({
    controllers: [PermissionController],
    providers: [PermissionService],
    exports: [PermissionService],
})

export class PermissionModule {}