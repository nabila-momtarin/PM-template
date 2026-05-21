import { BaseRepository } from "src/common/repositories/base.repository";

import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "../entities/user.schema";


export class UserRepository extends BaseRepository<UserDocument> {
  constructor( @InjectModel(User.name) private readonly userModel: Model<UserDocument>) {
    super(userModel);
  }

}