import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
// import { ProjectType } from "src/common/enums/project-type.enum";


export type ProjectDocument = HydratedDocument<Project>;
@Schema({timestamps: true})
export class Project {
    
    @Prop({ type: String, required: true})
    title: string;

    @Prop({ type: String})
    description?: string;

    // @Prop({ type: String, enum: Object.values(ProjectType) })
    // type?: ProjectType;

    @Prop({ type: String})
    repositoryURL?: string;

    @Prop({ type: Types.ObjectId, required: true})
    createdBy?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, /* required: true */})
    updatedBy?: Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean;

    @Prop({ type: Date})
    deletedAt?: Date;

    // @Prop({ type: String})
    // deletedBy: String;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);