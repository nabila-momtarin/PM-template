import { PermissionCatalog } from "../types/permissions.type";


export const PERMISSIONS: PermissionCatalog = [
   
   //projects
    {
    method: 'GET',
    path: '/api/v1/projects',
    label: 'View projects',
    category: 'Projects',
  },
  {
    method: 'POST',
    path: '/api/v1/projects',
    label: 'Create project',
    category: 'Projects',
  },
  {
    method: 'GET',
    path: '/api/v1/projects/:projectId',
    label: 'View project details',
    category: 'Projects',
  },
  {
    method: 'PATCH',
    path: '/api/v1/projects/:projectId',
    label: 'Edit project',
    category: 'Projects',
  },
  {
    method: 'DELETE',
    path: '/api/v1/projects/:projectId',
    label: 'Delete project',
    category: 'Projects',
  },
];