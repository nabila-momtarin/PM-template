import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { MODEL_NAMES } from "src/common/constants/model-names.constant";
import { TaskStatus } from "src/common/enums/task.enum";

export type TaskDocument = HydratedDocument<Task>;

@Schema( { timestamps: true} )
export class Task {

    @Prop({ type: String, unique: true })
    taskNumber: string;

    @Prop({ type: String, required: true })
    title: string;

    @Prop({ type: String })
    description?: string;

    @Prop({ type: [String], default: [] })
    attachments: string[];

    @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.PROJECT, required: true })
    projectId: Types.ObjectId;


    @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.TICKET, required: true })
    ticketId: Types.ObjectId;


    @Prop({ type: String, enum: Object.values(TaskStatus), required: true, default: TaskStatus.TODO })
    status: string;

    @Prop({ type: Date, })
    dueDate: Date;

    @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
    assignee: Types.ObjectId;

    // estimatedTime

    // completionDate

    // worktime

    @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
    createdBy: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
    updatedBy: Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean;

    @Prop({ type: Date, })
    deletedAt: Date;

    @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
    deletedBy: Types.ObjectId;
}


export const TaskSchema = SchemaFactory.createForClass(Task);