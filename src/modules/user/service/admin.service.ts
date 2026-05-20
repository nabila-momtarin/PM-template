import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, Param } from '@nestjs/common';
import { CreateUserDto } from './dto/admin-create-user.dto';
import { UserRepository } from './user.repository';
import { UserDocument } from './entities/user.schema';
import { Types } from 'mongoose';
import { RoleRepository } from '../role/role.repository';
import * as argon2 from 'argon2';
import { UsersQueryDto } from './dto/admin-getAll-users.dto';
import { UpdateUserDto } from './dto/admin-update-user.dto';
import { ResetPasswordDto } from './dto/admin-reset-password.dto';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly roleRepository: RoleRepository,
    ) { }

    private logger = new Logger(UserService.name);

    async createUser(dto: CreateUserDto , currentUser: AuthenticatedUser) {
        console.log('SERVICE : user : createUser\n');
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
        const userObj = newUser.toObject();
        delete userObj.password;
        delete userObj.__v; // remove __v field added by mongoose

        return {
            success: true,
            message: 'User created successfully',
            data: userObj,
        };
    }

    async getAllUsers(query: UsersQueryDto) {
        console.log('SERVICE : user : allUsers\n');

        const allUsers = await this.userRepository.getAllData({
            filter: query.filter ?? '{}',
            sortStr: query.sort ?? '-createdAt',
            page: String(query.page ?? 1),
            length: String(query.limit ?? query.length ?? 10),
            useLean: true,
        });

        console.log('All users: SERVICE: ', allUsers);
        return allUsers;
    }

    async getAUser(id: string) {
        console.log('SERVICE : user : getAUser\n');

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
            console.error('User not found: ', id);
            throw new NotFoundException('User not found');
        }

        console.log('user: SERVICE: ', user);
        return {
            success: true,
            message: 'User fetched successfully',
            data: user,
        };
    }

    async deleteUser(id: string) {
        console.log('SERVICE : user : deleteUser\n');

        const deletedUser = await this.userRepository.deleteById(id);

        if (!deletedUser) {
            console.error('User not found: ', id);
            throw new NotFoundException('User not found');
        }

        console.log('deletedUser: SERVICE: ', deletedUser);
        return {
            success: true,
            message: 'User deleted successfully',
            data: {
                id: id,
                name: deletedUser.name,
            },
        };
    }

    async updateUser(id: string, dto: UpdateUserDto) {
        console.log('SERVICE : user : updateUser\n');

        const userExist = await this.userRepository.findById({ id, useLean: true });

        if (!userExist) {
            console.error('User not found: ', id);
            throw new NotFoundException('User not found');
        }

        const updatedUser = await this.userRepository.updateByID(id, dto);

        console.log('updatedUser: SERVICE: ', updatedUser);
        return {
            success: true,
            message: 'User updated successfully',
            data: updatedUser,
        };
    }

    async resetPassword(id: string, dto: ResetPasswordDto) {
        console.log('SERVICE : user : resetPassword\n');

        const userExist = await this.userRepository.findById({ id, useLean: true });

        if (!userExist) {
            console.log('User not found: ', id);
            throw new NotFoundException('User not found');
        }

        if (dto.newPassword !== dto.confirmPassword) {
            console.log('Passwords does not match');
            throw new BadRequestException('Passwords does not match');
        }

        const hashedPassword = await argon2.hash(dto.newPassword);

        await this.userRepository.updateByID(
            id,
            {
                password: hashedPassword
            }
        );

        console.log('updatePassword: SERVICE: ', id);
        return {
            success: true,
            message: 'Password updated successfully',
            data: null,
        };
    }
}
