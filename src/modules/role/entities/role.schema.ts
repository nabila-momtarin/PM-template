import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { RolePermission } from "src/modules/permission/types/permissions.type";
import { User } from "src/modules/user/entities/user.schema";


export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true, collection: 'roles' })
export class Role {
    @Prop({ type: String, required: true, unique: true, trim: true })
    roleName: string;

    @Prop({
        type: [
            {
                 _id: false,
                method: {
                    type: String,
                    enum: ['GET', 'POST', 'PATCH', 'DELETE'],
                    required: true,
                },
                path: {
                    type: String,
                    required: true,
                    trim: true,
                },
            },
        ],
        required: true,
        default: [],
    })
    permissions: RolePermission[];


    @Prop({ type: Boolean, default: false })
    isSuperAdmin: boolean;

    @Prop({ type: Types.ObjectId, ref: User.name })
    createdBy?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name })
    updatedBy?: Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean;

    @Prop({ type: Date, default: null })
    deletedAt?: Date | null;

    @Prop({ type: Types.ObjectId, ref: User.name, default: null })
    deletedBy?: Types.ObjectId | null;
}

export const RoleSchema = SchemaFactory.createForClass(Role);