import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { MODEL_NAMES } from "src/common/constants/model-names.constant";
import { RolePermission } from "src/modules/permission/types/permissions.type";


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

    @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
    createdBy?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER })
    updatedBy?: Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean;

    @Prop({ type: Date, default: null })
    deletedAt?: Date | null;

    @Prop({ type: Types.ObjectId, ref: MODEL_NAMES.USER, default: null })
    deletedBy?: Types.ObjectId | null;
}

export const RoleSchema = SchemaFactory.createForClass(Role);