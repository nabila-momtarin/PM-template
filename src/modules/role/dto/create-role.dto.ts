import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsString } from "class-validator";
import { RolePermission } from "src/modules/permission/types/permissions.type";

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty()
    roleName: string;

    @IsArray()
    @IsNotEmpty({ each: true })
    // @Type(() => RolePermissionDto)
    permissions: RolePermission[];

}