import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from 'src/common/repositories/base.repository';
import { User } from './entities/user.schema';
import { UserDocument } from './interfaces/user.interface';

@Injectable()
export class UserRepository extends BaseRepository<UserDocument> {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  async findByUId(uId: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ uId, isDeleted: { $ne: true } })
      .lean<UserDocument>()
      .exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email, isDeleted: { $ne: true } })
      .lean<UserDocument>()
      .exec();
  }
}
