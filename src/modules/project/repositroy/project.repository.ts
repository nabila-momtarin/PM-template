import { Injectable } from "@nestjs/common";
import { BaseRepository } from "src/common/repositories/base.repository";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Project, ProjectDocument } from "./entities/project.schema";



@Injectable()
export class ProjectRepository extends BaseRepository <ProjectDocument> {
    constructor( @InjectModel(Project.name) private readonly projectModel : Model <ProjectDocument>) {
        super(projectModel);
    }


    // async findById( params: FindByIdParams): Promise<ProjectDocument | null> {
    //     return this.projectModel
    //     .findOne({ _id: params.id,
    //         isDeleted : { $ne: true}})
    //     .exec();
    // }

}