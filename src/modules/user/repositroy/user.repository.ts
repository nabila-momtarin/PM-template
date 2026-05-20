import { BaseRepository } from "src/common/repositories/base.repository";
import { User, UserDocument } from "./entities/user.schema";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";


export class UserRepository extends BaseRepository<UserDocument> {
  constructor( @InjectModel(User.name) private readonly userModel: Model<UserDocument>) {
    super(userModel);
  }

}