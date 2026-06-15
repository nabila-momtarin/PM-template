
export type PermissionCategory =
  | 'Tickets'
  | 'Projects'
  | 'Tasks'
  | 'Admin'
  | 'Me'
  | 'Role';


export type PermissionMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type RolePermission = {
    method : PermissionMethod;
    path: string;
};

              
export type PermissionCatalogItem = RolePermission & {
    label: string;
    category: PermissionCategory;
};

export type PermissionCatalog = PermissionCatalogItem[];