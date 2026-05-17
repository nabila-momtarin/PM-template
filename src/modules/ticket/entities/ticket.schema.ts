import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { date, string } from "joi";
import { Date, HydratedDocument, Types } from "mongoose";
import { MODEL_NAMES } from "src/common/constants/model-names.constant";
import { TicketPriority, TicketQAStatus, TicketStatus, TicketType } from "src/common/enums/ticket.enum";

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ timestamps: true })
export class Ticket {
    @Prop( {type: string, unique: true, required: true})
    ticketNumber: String;

    @Prop( {type: string, required: true, trim: true} )
    title: String;

    @Prop({type: string, trim: true})
    description?: String;

    @Prop({type: [string], default: []})
    attachments?: String[];

    @Prop( {type: TicketType, enum: Object.values(TicketType), required: true,} )
    ticketType?: String;

    @Prop( {type: TicketPriority, enum: Object.values(TicketPriority), required: true,} )
    priority?: TicketPriority;

    @Prop( {type: TicketStatus, enum: Object.values(TicketStatus), default: TicketStatus.OPEN} )
    status?: TicketStatus;

    @Prop({type: TicketQAStatus, enum: Object.values(TicketQAStatus), default: TicketQAStatus.NOT_TESTED})
    qaStatus: TicketQAStatus;

    @Prop([{type: Types.ObjectId, ref: MODEL_NAMES.PROJECT}])
    projects: Types.ObjectId[];

    @Prop({type: date, required: true})
    dueDate: Date;

    @Prop({type: Types.ObjectId, ref: MODEL_NAMES.USER, required: true})
    createdBy: Types.ObjectId;

    @Prop({type: Types.ObjectId, ref: MODEL_NAMES.USER})
    updatedBy: Types.ObjectId;

    @Prop({type: Boolean, default: false})
    isDeleted: boolean;

    @Prop({type: Date})
    deletedAt?: Date;

    @Prop({type: Types.ObjectId, ref: MODEL_NAMES.USER})
    deletedBy?: Types.ObjectId;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);