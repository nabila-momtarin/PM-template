import { Controller, Get, Logger } from "@nestjs/common";
import { PermissionService } from "../service/permission.service";


@Controller('permissions')
export class PermissionController {
    constructor( private readonly permissionService: PermissionService) {}

    private readonly logger = new Logger( PermissionController.name);

    @Get()
    getAllPermissions() {

        this.logger.log('controller: Fetching all permissions');

        return this.permissionService.getAllPermission();
    }

}