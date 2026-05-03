import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
/**
 * User Mongoose schema — read-only replica of the user-service collection.
 *
 * Rules:
 *   - No enums, no required, no transforms — preserve data exactly as received.
 *   - _id is kept from the source collection for idempotent upserts.
 *   - roles / phoneUpdateHistory are Mixed — shape is owned by the user service.
 *   - password is excluded from query results by default (select: false).
 *   - Only index fields we actively query.
 */
@Schema({ timestamps: true, collection: 'users' })
export class User extends Document{
  // @Prop({ type: String, /* index: true */ })
  // uId: string;

  @Prop({ type: String, required: true, /* trim: true, */ /*  index: true */ })
  name: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true /*, index: true */ })
  email: string;

  @Prop({ type: String /*, index: true */ })
  phoneNumber: string;

  @Prop({ type: String })
  photo: string;

  @Prop({ type: String, required: true, select: false })
  password: string;

  // @Prop({ type: Types.ObjectId, ref: 'Role', required: true /*, index: true */ })
  // role: Role;
  
  @Prop({ type: Boolean, default: false /*, index: true */ })
  isDeleted: boolean;

  @Prop({ type: Date, nullable: true })
  deletedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', nullable: true })
  deletedBy: User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;


  
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound text index for search by name or uId
UserSchema.index({ name: 'text', uId: 'text' });
