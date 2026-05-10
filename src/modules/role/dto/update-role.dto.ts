import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { RolePermission } from "src/modules/permission/types/permissions.type";
import { RolePermissionDto } from "./role-permission.dto";
import { Type } from "class-transformer";

export class UpdateRoleDto {
    
    @IsString()
    @IsOptional()
    roleName?: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => RolePermissionDto)
    permissions?: RolePermissionDto[];
}