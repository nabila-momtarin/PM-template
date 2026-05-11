import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/admin-create-user.dto';
import { UserRepository } from './user.repository';
import { UserDocument } from './entities/user.schema';
import { Types } from 'mongoose';
import { RoleRepository } from '../role/role.repository';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly roleRepository: RoleRepository,
    ) { }

    async createUser(dto: CreateUserDto) {
        console.log('SERVICE : user : createUser\n');
        console.log('DTO : ', dto, '\n');

        //email existence check
        const existingUser = await this.userRepository.findOne({
            filters: { email: dto.email },
            useLean: true,
        });

        if (existingUser) {
            console.error('User already exists');
            throw new ConflictException('User with this email already exists');
        }

        //roll existence check
        const roleExists = await this.roleRepository.findById({ id: dto.role, useLean: true });

        if (!roleExists) {
            console.error('Role not found: ', dto.role);
            throw new NotFoundException('Role not found');
        }

        //make proper payload for user creation
        const userPayload: Partial<UserDocument> = {
            ...dto,
            role: new Types.ObjectId(dto.role),
        };

        const newUser = await this.userRepository.createOne(userPayload);

        if (!newUser) {
            console.error('Failed to create user');
            throw new Error('Failed to create user');
        }
        console.log('New User Created : ', newUser, '\n');

        return {
            success: true,
            message: 'User created successfully',
            data: newUser,
        }

    }
}
