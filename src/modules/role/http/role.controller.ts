import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { RoleService } from "../role.service";
import { CreateRoleDto } from "../dto/create-role.dto";
import { RolesQueryDto } from "../dto/getAll-roles.dto";


@Controller('roles')
export class RoleController {
    constructor( private readonly roleService : RoleService) {}

    @Post()
    async createRole(@Body() createRoleDto: CreateRoleDto) {
        console.log('CONTROLLER: Creating a new role\n');

        return await this.roleService.createRole(createRoleDto);
    }

    @Get()
    async getAllRoles(@Query() query: RolesQueryDto) {
        console.log('CONTROLLER: Fetching all roles\n');

        return this.roleService.getAllRoles(query);

    }

    @Get(':roleId')
    async getRoleById(@Param('roleId') roleId: string ) {
        console.log('CONTROLLER: Fetching role by ID\n');

        return this.roleService.getRoleById(roleId);
    }
}