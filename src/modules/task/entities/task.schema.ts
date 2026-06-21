import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MODEL_NAMES } from 'src/common/constants/model-names.constant';
import { TaskStatus } from 'src/common/enums/task.enum';

export type TaskDocument = HydratedDocument<Task>;

export type WorktimeEntry = {
  startTime: Date;
  endTime: Date | null;
};

@Schema({ timestamps: true })
export class Task {
  @Prop({ type: String, unique: true })
  taskNumber: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  //change later to required
  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.PROJECT/* , required: true  */})
  projectId: Types.ObjectId;

  //change later to required
  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.TICKET/* , required: true  */})
  ticketId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(TaskStatus), required: true, default: TaskStatus.TODO })
  status: string;

  @Prop({ type: Date })
  dueDate: Date;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
  assignee: Types.ObjectId;

  @Prop({ type: Number, min: 0, default: 0 })
  estimatedTime?: number; // stored in minutes

  @Prop({ type: Date, default: null })
  completionDate?: Date | null;

  @Prop({
    type: [
      {
        startTime: { type: Date, required: true },
        endTime: { type: Date, default: null },
      },
    ],
    default: [],
  })
  worktime: WorktimeEntry[];

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
  updatedBy: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
  deletedBy: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
