import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../repositroy/role.repository';
import { CreateRoleDto } from '../dto/create-role.dto';
import { RolesQueryDto } from '../dto/getAll-roles.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  private readonly logger = new Logger(RoleService.name);

  async createRole(createRoleDto: CreateRoleDto) {
    // console.log('SERVICE: Creating a new role\n');
    this.logger.debug('..');

    try {
      const newRole = await this.roleRepository.createOne(createRoleDto);

      // if(!newRole) {
      //     console.error('Failed to create role');
      //     throw new Error('Failed to create role');
      // }

      // console.log('newRole: SERVICE: ', newRole);
      this.logger.debug(`Created Role: SERVICE: ${newRole}`);

      return {
        success: true,
        message: 'Role created successfully',
        data: newRole,
      };
    } catch (err) {
      this.logger.error('RoleService.createRole failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async getAllRoles(query: RolesQueryDto) {
    // console.log('SERVICE: Fetching all roles\n');
    this.logger.debug('..');
    try {
      const allRoles = await this.roleRepository.getAllData({
        filter: query.filter ?? '{}',
        sortStr: query.sort ?? '-createdAt',
        page: String(query.page ?? 1),
        length: String(query.limit ?? query.length ?? 10),
        useLean: true,
      });

      // console.log('allRoles: SERVICE: ', allRoles);
      this.logger.debug(`All Roles: SERVICE: ${allRoles}`);

      return {
        success: true,
        message: 'Roles fetched successfully',
        data: allRoles.data,
        pagination: allRoles.pagination,
      };
    } catch (err) {
      this.logger.error('RoleService.getAllRoles failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async getRoleById(roleId: string) {
    // console.log('SERVICE: Fetching role by ID\n');
    this.logger.debug('..');

    try {
      const role = await this.roleRepository.findById({ id: roleId });

      if (!role) {
        // console.log('Role not found: SERVICE: ', roleId);
        this.logger.debug(`Role not found: SERVICE: ${roleId}`);

        return {
          success: false,
          message: 'Role not found',
          data: null,
        };
      }

      // console.log('role: SERVICE: ', role);
      this.logger.debug(`Role: SERVICE: ${role}`);

      return {
        success: true,
        message: 'Role fetched successfully',
        data: role,
      };
    } catch (err) {
      this.logger.error('RoleService.getRoleById failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async deleteRole(roleId: string) {
    // console.log('SERVICE: Deleting role by ID\n');
    this.logger.debug('..');

    try {
      const role = await this.roleRepository.findById({ id: roleId });

      if (!role) {
        // console.log('Role not found: SERVICE: ', roleId);
        this.logger.debug(`Role not found: SERVICE: ${roleId}`);

        throw new NotFoundException('Role not found');

        //   return {
        //     success: false,
        //     message: 'Role not found',
        //     data: null,
        //   };
      }

      if (role.isSuperAdmin) {
        //  console.log ('SERVICE  : Super Admin role cannot be deleted');
        this.logger.error(`Super Admin role cannot be deleted`);
        throw new BadRequestException('Super Admin role cannot be deleted');
      }

      const deletedRole = await this.roleRepository.deleteById(roleId);

      // console.log('deletedRole: SERVICE: ', deletedRole);
      this.logger.debug(`Deleted Role: SERVICE: ${deletedRole}`);

      return {
        success: true,
        message: 'Role deleted successfully',
        data: {
          id: roleId,
          title: role.roleName,
        },
      };
    } catch (err) {
      this.logger.error('RoleService.deleteRole failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async updateRole(roleId: string, updateRoleDto: UpdateRoleDto) {
    // console.log('SERVICE: Updating role by ID\n');
    this.logger.debug('..');

    try {
      const role = await this.roleRepository.findById({ id: roleId });

      if (!role) {
        // console.log('Role not found: SERVICE: ', roleId);
        this.logger.error(`Role not found: SERVICE: ${roleId}`);
        throw new NotFoundException('Role not found');
      }

      if (role.isSuperAdmin) {
        // console.log ('SERVICE : Super Admin role cannot be updated');
        this.logger.error(`Super Admin role cannot be updated`);
        throw new BadRequestException('Super Admin role cannot be updated');
      }

      const updatedRole = await this.roleRepository.updateByID(roleId, updateRoleDto);

      // console.log('updatedRole: SERVICE: ', updatedRole);
      this.logger.debug(`Updated Role: SERVICE: ${updatedRole}`);

      return {
        success: true,
        message: 'Role updated successfully',
        data: updatedRole,
      };
    } catch (err) {
      this.logger.error('RoleService.updateRole failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }
}
