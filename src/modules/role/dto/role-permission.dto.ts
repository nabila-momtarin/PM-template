import { IsIn, IsNotEmpty, IsString } from "class-validator";
import { PermissionMethod } from "src/modules/permission/types/permissions.type";

export class RolePermissionDto {
  @IsString()
  @IsIn(['GET', 'POST', 'PATCH', 'DELETE'])
  method: PermissionMethod;

  @IsString()
  @IsNotEmpty()
  path: string;
}