import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from '../repositroy/user.repository';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { UpdateMeDto } from '../dto/update-me.dto';
import { Types } from 'mongoose';
import { ChangePasswordDto } from '../dto/my-password.dto';

import * as argon2 from 'argon2';

@Injectable()
export class MyService {
  constructor(private readonly userRepository: UserRepository) {}

  private logger = new Logger(MyService.name);

  async getMe(me: AuthenticatedUser) {
    this.logger.log('...');

    const myProfile = await this.userRepository.findById({
      id: me.userId,
      useLean: true,
      select: '-password -__v -isDeleted -deletedAt -deletedBy -createdBy -updatedAt',
      populate: {
        path: 'role',
        select: '_id roleName permissions', // ← permissions সহ
      },
    });

    this.logger.debug(`Fetched User: Me: SERVICE: ${myProfile}`);
    this.logger.debug("Fetched User: Me: SERVICE: ", myProfile);
    
    return {
      success: true,
      message: 'Profile fetched successfully',
      data: myProfile,
    };
  }

  async updateMe(
    dto: UpdateMeDto,
    file: Express.Multer.File /* | undefined */,
    me: AuthenticatedUser,
  ) {
    this.logger.log('...');

    const profilePayload = {
      ...dto,
      updatedBy: new Types.ObjectId(me.userId),
    };

    this.logger.debug('file : ', file /* .filename */);
    this.logger.debug(`file: ${JSON.stringify(file, null, 2)}`);

    if (file) {
      profilePayload.photo = `/uploads/profilePhoto/${file.filename}`;
      this.logger.debug('photo', profilePayload.photo);
    } else {
      this.logger.debug('No profile photo uploaded');
    }

    const updatedMyprofile = await this.userRepository.updateByID(me.userId, profilePayload, {
      useLean: true,
    });

    if (!updatedMyprofile) {
      throw new NotFoundException('Profile not found');
    }

    this.logger.debug('Updated User: Me: SERVICE: ', updatedMyprofile);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedMyprofile,
    };
  }

  async changeMyPassword(dto: ChangePasswordDto, me: AuthenticatedUser) {
    this.logger.log('...');

    const user = await this.userRepository.findById({
      id: me.userId,
      useLean: true,
      select: '+password name email',
    });

    if (!user) {
      this.logger.error('Profile not found');
      throw new NotFoundException('Profile not found');
    }

    const isCurrentPasswordCorrect = await argon2.verify(user.password, dto.currentPassword);

    if (!isCurrentPasswordCorrect) {
      this.logger.error('Current password is incorrect');
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      this.logger.error('New password must differ from the current password');
      throw new BadRequestException('New password must differ from the current password');
    }

    if (dto.newPassword !== dto.confirmPassword) {
      this.logger.error('Passwords do not match');
      throw new BadRequestException('Passwords do not match');
    }

    const hashedNewPassword = await argon2.hash(dto.newPassword);

    const updatedUser = await this.userRepository.updateByID(
      me.userId,
      {
        password: hashedNewPassword,
        updatedBy: new Types.ObjectId(me.userId),
      },
      {
        useLean: true,
      },
    );

    this.logger.debug('Updated User: Me: SERVICE: ', updatedUser);

    return {
      success: true,
      message: 'Password changed successfully',
      data: null,
    };
  }
}
