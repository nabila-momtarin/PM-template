import { Document } from 'mongoose';
import { User } from '../entities/user.schema';

/**
 * UserDocument = Mongoose Document + User class fields.
 * Use this type everywhere you work with raw Mongoose documents.
 */
export type UserDocument = User & Document;
