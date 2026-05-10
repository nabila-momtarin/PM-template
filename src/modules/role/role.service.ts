import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleRepository } from './role.repository';

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
}
