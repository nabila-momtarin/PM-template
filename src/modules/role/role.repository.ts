import { BaseRepository } from "src/common/repositories/base.repository";
import { Role, RoleDocument } from "./entities/role.schema";
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";



export class RoleRepository extends BaseRepository<RoleDocument> {

    constructor (@InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>) {
       console.log('ROLE MODEL:', roleModel);
        super(roleModel);
    }


    
}