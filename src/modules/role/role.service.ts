import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleRepository } from './role.repository';
import { RolesQueryDto } from './dto/getAll-roles.dto';

@Injectable()
export class RoleService {
    constructor(private readonly roleRepository: RoleRepository) { }


    
    async createRole(createRoleDto: CreateRoleDto) {
        console.log('SERVICE: Creating a new role\n');

        const newRole = await this.roleRepository.createOne(createRoleDto);

        // if(!newRole) {
        //     console.error('Failed to create role');
        //     throw new Error('Failed to create role');
        // }

        console.log('newRole: SERVICE: ', newRole);

        return {
            success: true,
            message: 'Role created successfully',
            data: newRole
        };
    }

    async getAllRoles(query: RolesQueryDto) {
        console.log('SERVICE: Fetching all roles\n');

        const allRoles = await this.roleRepository.getAllData({
            filter: query.filter ?? '{}',
            sortStr: query.sort ?? '-createdAt',
            page: String(query.page ?? 1),
            length: String(query.limit ?? query.length ?? 10),
             useLean: true,

        }); 

        console.log('allRoles: SERVICE: ', allRoles);

        return {
            success: true,
            message: 'Roles fetched successfully',
            data: allRoles.data,
            pagination: allRoles.pagination
        };
    }

    async getRoleById(roleId: string) {
        console.log('SERVICE: Fetching role by ID\n');

        const role = await this.roleRepository.findById({ id: roleId});

        if(!role) {
            console.log('Role not found: SERVICE: ', roleId);
            return {
                success: false,
                message: 'Role not found',
                data: null
            };
        }

        console.log('role: SERVICE: ', role);

        return {
            success: true,
            message: 'Role fetched successfully',
            data: role
        };
    }
}
//  filter: any;
//   sortStr: string;
//   page: string;
//   length: string;