import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MODEL_NAMES } from 'src/common/constants/model-names.constant';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, required: true, trim: true, /*  index: true */ })
  name: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true /*, index: true */ })
  email: string;

  @Prop({ type: String /*, index: true */ })
  phoneNumber?: string;

  @Prop({ type: String })
  photo?: string;

  @Prop({ type: String, required: true, select: false })
  password: string;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.ROLE, required: true })
  role: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER, /* required: true,  */default: null })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER, })
  updatedBy: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false /*, index: true */ })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER, default : null })
  deletedBy?: Types.ObjectId | null;

}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound text index for search by name or uId
// UserSchema.index({ name: 'text', uId: 'text' });
/* UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
); */