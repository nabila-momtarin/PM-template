

export type PermissionMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type RolePermission = {
    method : PermissionMethod;
    path: string;
};

              
export type PermissionCatalogItem = RolePermission & {
    label: string;
    category: string;
};

export type PermissionCatalog = PermissionCatalogItem[];