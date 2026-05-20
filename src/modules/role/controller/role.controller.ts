import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { RoleService } from "../service/role.service";
import { CreateRoleDto } from "../dto/create-role.dto";
import { RolesQueryDto } from "../dto/getAll-roles.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";


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

    @Delete(':roleId')
    async deleteRole(@Param('roleId') roleId: string) {
        console.log('CONTROLLER: Deleting role by ID\n');

        return this.roleService.deleteRole(roleId);
    }

    @Patch(':roleId')
    async updateRole(@Param('roleId') roleId: string, @Body() updateRoleDto: UpdateRoleDto) {
        console.log('CONTROLLER: Updating role by ID\n');

        return this.roleService.updateRole(roleId, updateRoleDto);
    }
}