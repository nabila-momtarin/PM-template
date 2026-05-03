import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { ProjectType } from "src/common/enums/project-type.enum";


export type ProjectDocument = HydratedDocument<Project>;
@Schema({timestamps: true})
export class Project {
    
    @Prop({ type: String, required: true})
    title: string;

    @Prop({ type: String})
    description?: string;

    @Prop({ type: String, enum: ProjectType })
    type: ProjectType;

    @Prop({ type: String})
    repositoryURL: string;

//     @Prop({ type: ---, required: true})
//     createdBy: ---;

// @Prop({ type: ---, required: true})
//     updatedBy: ---;

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean;

    @Prop({ type: Date})
    deletedAt?: Date;

    // @Prop({ type: String})
    // deletedBy: String;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);