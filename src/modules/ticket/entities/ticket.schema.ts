import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MODEL_NAMES } from 'src/common/constants/model-names.constant';
import {
  TicketPriority,
  TicketQAStatus,
  TicketStatus,
  TicketType,
} from 'src/common/enums/ticket.enum';

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ type: String, unique: true, required: true })
  ticketNumber: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: String, enum: Object.values(TicketType), required: true })
  ticketType: TicketType;

  @Prop({ type: String, enum: Object.values(TicketPriority), required: true })
  priority: TicketPriority;

  @Prop({ type: String, enum: Object.values(TicketStatus), default: TicketStatus.OPEN })
  status?: TicketStatus;

  @Prop({ type: String, enum: Object.values(TicketQAStatus), default: TicketQAStatus.NOT_TESTED })
  qaStatus: TicketQAStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: MODEL_NAMES.PROJECT }], default: [] })
  projects: Types.ObjectId[];

  @Prop({ type: Date, required: true })
  dueDate: Date;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
  updatedBy?: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
  deletedBy?: Types.ObjectId;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
