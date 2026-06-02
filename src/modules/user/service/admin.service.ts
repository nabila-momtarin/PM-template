import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { Types } from 'mongoose';
import * as argon2 from 'argon2';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { RoleRepository } from 'src/modules/role/repositroy/role.repository';
import { UserRepository } from '../repositroy/user.repository';
import { CreateUserDto } from '../dto/admin-create-user.dto';
import { UserDocument } from '../entities/user.schema';
import { UsersQueryDto } from '../dto/admin-getAll-users.dto';
import { UpdateUserDto } from '../dto/admin-update-user.dto';
import { ResetPasswordDto } from '../dto/admin-reset-password.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  private logger = new Logger(AdminService.name);

  async createUser(dto: CreateUserDto, currentUser: AuthenticatedUser) {
    // console.log('SERVICE : user : createUser\n');
    try {
      this.logger.log('SERVICE: CURRENT USER:', currentUser);

      //email existence check
      const existingUser = await this.userRepository.findOne({
        filters: { email: dto.email },
        useLean: true,
      });

      if (existingUser) {
        this.logger.error('User already exists');
        throw new ConflictException('User with this email already exists');
      }

      //roll existence check
      const roleExists = await this.roleRepository.findById({ id: dto.role, useLean: true });

      if (!roleExists) {
        console.error('Role not found: ', dto.role);
        throw new NotFoundException('Role not found');
      }

      //password hashing
      const hashedPassword = await argon2.hash(dto.password);

      //make proper payload for user creation
      const userPayload: Partial<UserDocument> = {
        ...dto,
        password: hashedPassword,
        role: new Types.ObjectId(dto.role),
        createdBy: new Types.ObjectId(currentUser.userId),
      };

      //creatae user
      const newUser: any = await this.userRepository.createOne(userPayload);

      if (!newUser) {
        console.error('Failed to create user');
        throw new Error('Failed to create user');
      }
      this.logger.debug('New User Created : ', newUser, '\n');

      //Mongoose document theke plain obj banaite to remove password from the response, and also to remove all the mongoose document methods and properties
      //remove password from the response
      // const userObj = newUser.toObject();
      // delete userObj.password;
      // delete userObj.__v; // remove __v field added by mongoose

      const populatedUser: any = await this.userRepository.findById({
        id: newUser._id.toString(),
        useLean: true,
        populate: [{ path: 'role', select: '_id roleName' }],
        select: '-password -__v -isDeleted -deletedAt -deletedBy',
      });

      return {
        success: true,
        message: 'User created successfully',
        data: populatedUser,
      };
    } catch (err) {
      this.logger.error('Error in creating user', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async getAllUsers(query: UsersQueryDto) {
    this.logger.log('...');

    try {
      const allUsers = await this.userRepository.getAllData({
        filter: query.filter ?? '{}',
        sortStr: query.sort ?? '-createdAt',
        page: String(query.page ?? 1),
        length: String(query.limit ?? query.length ?? 10),
        useLean: true,
      });

      this.logger.log('allUsers: SERVICE: ', allUsers);
      // return allUsers;

      return {
        success: true,
        message: 'Users fetched successfully',
        data: allUsers.data,
        pagination: allUsers.pagination,
      };
    } catch (err) {
      this.logger.error(
        'AdminService.getAllUsers: Error in getting all users',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getAUser(id: string) {
    this.logger.log('...');

    try {
      const user = await this.userRepository.findById({
        id,
        useLean: true,
        select: '-password -__v -isDeleted -deletedAt -deletedBy -createdBy -updatedAt',
        populate: {
          path: 'role',
          select: 'roleName permissions',
        },
      });

      if (!user) {
        // console.error('User not found: ', id);
        this.logger.error(`User not found: ${id}`);
        throw new NotFoundException('User not found');
      }

      this.logger.debug(`Fetched User: SERVICE: ${user}`);
      return {
        success: true,
        message: 'User fetched successfully',
        data: user,
      };
    } catch (err) {
      this.logger.error(
        'AdminService.getAUser: Error in getting a user',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async deleteUser(id: string, currentUser: AuthenticatedUser) {
    this.logger.log('...');

    try {
      // const deletedUser = await this.userRepository.deleteById(id);

      // if (id === currentUser.userId) {
      //   throw new BadRequestException('You cannot delete your own account');
      // }

      if (new Types.ObjectId(id).toString() === new Types.ObjectId(currentUser.userId).toString())
        throw new BadRequestException('You cannot delete your own account');

      const deletedUser = await this.userRepository.softDeleteById(
        id,
        { useLean: true },
        {
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(currentUser.userId),
        },
      );

      if (!deletedUser) {
        // console.error('User not found: ', id);
        this.logger.error(`User not found: ${id}`);
        throw new NotFoundException('User not found');
      }

      this.logger.debug(`Deleted User: SERVICE: ${deletedUser}`);

      return {
        success: true,
        message: 'User deleted successfully',
        data: {
          id: id,
          name: deletedUser.name,
        },
      };
    } catch (err) {
      this.logger.error(
        'AdminService.deleteUser: Error in deleting a user',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateUser(id: string, dto: UpdateUserDto, currentUser: AuthenticatedUser) {
    this.logger.log('...');

    try {
      const callerRole = await this.roleRepository.findById({
        id: currentUser.roleId,
        useLean: true,
      });
      if (!callerRole?.isSuperAdmin) throw new ForbiddenException('Access denied');

      if (id === currentUser.userId) {
        throw new BadRequestException('Use PATCH /api/v1/me to update your own profile');
      }

      const userExist = await this.userRepository.findById({ id, useLean: true });

      if (!userExist) {
        console.error('User not found: ', id);
        throw new NotFoundException('User not found');
      }

      // const updatedUser = await this.userRepository.updateByID(id, dto);

      const updatedUser = await this.userRepository.updateByID(id, {
        ...dto,
        ...(dto.role && { role: new Types.ObjectId(dto.role) }),
        updatedBy: new Types.ObjectId(currentUser.userId),
      });

      // console.log('updatedUser: SERVICE: ', updatedUser);
      this.logger.debug(`Updated User: SERVICE: ${updatedUser}`);
      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (err) {
      this.logger.error(
        'AdminService.updateUser: Error in updating a user',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async resetPassword(id: string, dto: ResetPasswordDto, currentUser: AuthenticatedUser) {
    // console.log('SERVICE : user : resetPassword\n');
    this.logger.log('...');

    try {
      if (id === currentUser.userId) {
        throw new BadRequestException(
          'Use PATCH /api/v1/me/change-password to reset your own password',
        );
      }

      const userExist = await this.userRepository.findById({ id, useLean: true });

      if (!userExist) {
        // console.log('User not found: ', id);
        this.logger.error(`User not found: ${id}`);
        throw new NotFoundException('User not found');
      }

      if (dto.newPassword !== dto.confirmPassword) {
        // console.log('Passwords does not match');
        this.logger.error('Passwords does not match');
        throw new BadRequestException('Passwords does not match');
      }

      const hashedPassword = await argon2.hash(dto.newPassword);

      await this.userRepository.updateByID(id, {
        password: hashedPassword,
        updatedBy: new Types.ObjectId(currentUser.userId),
      });

      // console.log('updatePassword: SERVICE: ', id);
      this.logger.debug(`Password updated: SERVICE: ${id}`);

      return {
        success: true,
        message: 'Password reset successfully',
        data: null,
      };
    } catch (err) {
      this.logger.error(
        'AdminService.resetPassword: Error in resetting password',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }
}
