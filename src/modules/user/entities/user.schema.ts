import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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
export class User {
  @Prop({ type: String, index: true })
  uId: string;

  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  @Prop({ type: String, index: true })
  name: string;

  @Prop({ type: String })
  username: string;

  @Prop({ type: String, index: true })
  email: string;

  @Prop({ type: String, select: false })
  password: string;

  @Prop({ type: String, index: true })
  phone: string;

  @Prop({ type: String, default: null })
  gender: string;

  @Prop({ type: String, default: null })
  address: string;

  @Prop({ type: String, default: null })
  country: string;

  @Prop({ type: String, default: null })
  birthday: string;

  @Prop({ type: [String], default: [] })
  businesses: string[];

  @Prop({ type: String, default: null })
  profileImage: string;

  @Prop({ type: String, index: true })
  kycStatus: string;

  @Prop({ type: String, index: true })
  accStatus: string;

  @Prop({ type: String, default: null })
  kycDocumentType: string;

  @Prop({ type: String, default: null })
  kycDocumentId: string;

  @Prop({ type: String, default: null })
  kycDocumentFront: string;

  @Prop({ type: String, default: null })
  kycDocumentBack: string;

  @Prop({ type: String, default: null })
  kycExpiryDate: string;

  @Prop({ type: String, default: null })
  referral: string;

  @Prop({ type: String, default: null })
  currency: string;

  @Prop({ type: String, default: null })
  twoFactorSecret: string;

  @Prop({ type: Object, default: {} })
  roles: Record<string, any>;

  @Prop({ type: [Object], default: [] })
  phoneUpdateHistory: Record<string, any>[];

  @Prop({ default: false, index: true })
  isDeleted: boolean;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({ type: String, default: null })
  rejectionReason: string;

  @Prop({ type: Date, default: null })
  verifiedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound text index for search by name or uId
UserSchema.index({ name: 'text', uId: 'text' });
