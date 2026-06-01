import { Cache } from 'cache-manager';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RoleRepository } from '../repositroy/role.repository';
import { CreateRoleDto } from '../dto/create-role.dto';
import { RolesQueryDto } from '../dto/getAll-roles.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { UserRepository } from 'src/modules/user/repositroy/user.repository';
import { Types } from 'mongoose';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository,
    private readonly userRepository: UserRepository,
     @Inject(CACHE_MANAGER) private cacheManager: Cache, 
  ) { }

  private readonly logger = new Logger(RoleService.name);


   private async invalidateRoleCache(roleId: string): Promise<void> {
    await this.cacheManager.del(`role:${roleId}`);
  }
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
      if (!Types.ObjectId.isValid(roleId)) {
        throw new BadRequestException('Invalid role id');
      }
      const role = await this.roleRepository.findById({ id: roleId });

      if (!role) {
        // console.log('Role not found: SERVICE: ', roleId);
        this.logger.debug(`Role not found: SERVICE: ${roleId}`);

        throw new NotFoundException('Role not found');
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

  async deleteRole(roleId: string, currentUser: AuthenticatedUser) {
    // console.log('SERVICE: Deleting role by ID\n');
    this.logger.debug('..');

    try {
      const role = await this.roleRepository.findById({
        id: roleId,
        useLean: true,
      });

      if (!role) {
        // console.log('Role not found: SERVICE: ', roleId);
        this.logger.debug(`Role not found: SERVICE: ${roleId}`);

        throw new NotFoundException('Role not found');
      }

      if (role.isSuperAdmin) {
        //  console.log ('SERVICE  : Super Admin role cannot be deleted');
        this.logger.error(`Super Admin role cannot be deleted`);
        throw new BadRequestException('Super Admin role cannot be deleted');
      }


      //check if users are assigned to this role
      const hasAssignedUser = await this.userRepository.exists({
        role: new Types.ObjectId(roleId),
      });

      if (hasAssignedUser) {
        this.logger.error('Cannot delete role because users are assigned to this role');
        throw new BadRequestException('Cannot delete role because users are assigned to this role');
      }
      // const deletedRole = await this.roleRepository.deleteById(roleId);
      const deletedRole = await this.roleRepository.softDeleteById(
        roleId,
        { useLean: true },
        {
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(currentUser.userId),
        },
      );

      if (!deletedRole) {
        throw new NotFoundException('Role not found');
      }

       await this.invalidateRoleCache(roleId); 
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

       await this.invalidateRoleCache(roleId); 

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
