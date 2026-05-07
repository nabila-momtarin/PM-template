import { IsNotEmpty, IsString } from "class-validator";
import { RolePermission } from "src/modules/permission/types/permissions.type";

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    roleName: string;


    permissions: RolePermission[];

}