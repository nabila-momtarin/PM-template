import { BaseRepository } from "src/common/repositories/base.repository";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Role, RoleDocument } from "../entities/role.schema";



export class RoleRepository extends BaseRepository<RoleDocument> {

    constructor (@InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>) {
       console.log('ROLE MODEL:', roleModel);
        super(roleModel);
    }


    
}