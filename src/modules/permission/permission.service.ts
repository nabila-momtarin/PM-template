import { ApiResponse } from "src/common/types/response.types";
import { PERMISSIONS } from "./config/permissions.config";
import { PermissionCatalog } from "./types/permissions.type";



export class PermissionService {
    constructor() {}

    getAllPermission()  : ApiResponse<PermissionCatalog>  {
        return {
            success: true,
            message: 'Permissions fetched successfully',
            data: PERMISSIONS,
        };
    }

    
/*   validatePermissions(permissions: RolePermission[]): void {
    if (!Array.isArray(permissions)) {
      throw new BadRequestException('Permissions must be an array');
    }

    const invalidPermissions = permissions.filter(
      (permission) => !this.isPermissionExists(permission),
    );

    if (invalidPermissions.length > 0) {
      const invalidList = invalidPermissions
        .map((permission) => `${permission.method} ${permission.path}`)
        .join(', ');

      throw new BadRequestException(`Invalid permissions: ${invalidList}`);
    }
  }

  sanitizePermissions(permissions: RolePermission[]): RolePermission[] {
    this.validatePermissions(permissions);

    return permissions.map((permission) => ({
      method: permission.method,
      path: permission.path,
    }));
  }

  private isPermissionExists(permission: RolePermission): boolean {
    return PERMISSIONS.some(
      (catalogPermission) =>
        catalogPermission.method === permission.method &&
        catalogPermission.path === permission.path,
    );
  } */

}