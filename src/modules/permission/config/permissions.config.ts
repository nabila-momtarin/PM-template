import { PermissionCatalog } from '../types/permissions.type';

export const PERMISSIONS: PermissionCatalog = [
  // ── Tickets: 10 ─────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/tickets',
    label: 'View tickets',
    category: 'Tickets',
  },
  {
    method: 'POST',
    path: '/api/v1/tickets',
    label: 'Create ticket',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:ticketId',
    label: 'Edit ticket',
    category: 'Tickets',
  },
  {
    method: 'DELETE',
    path: '/api/v1/tickets/:ticketId',
    label: 'Delete ticket',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:ticketId/change-status/in-progress',
    label: 'Move ticket to In Progress',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:ticketId/change-status/developed',
    label: 'Move ticket to Developed',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:ticketId/change-status/qa-in-progress',
    label: 'Move ticket to QA In Progress',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:ticketId/change-status/ready-for-release',
    label: 'Move ticket to Ready for Release',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:ticketId/change-status/released',
    label: 'Move ticket to Released',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:ticketId/change-status/closed',
    label: 'Move ticket to Closed',
    category: 'Tickets',
  },

  // ── Projects: 5 ────────────────────────────────────────────
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

  // ── Tasks: 4 ───────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/tasks',
    label: 'View tasks',
    category: 'Tasks',
  },
  {
    method: 'POST',
    path: '/api/v1/tasks',
    label: 'Create task',
    category: 'Tasks',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tasks/:taskId',
    label: 'Edit task',
    category: 'Tasks',
  },
  {
    method: 'DELETE',
    path: '/api/v1/tasks/:taskId',
    label: 'Delete task',
    category: 'Tasks',
  },
  // ── Admin: 4 ──────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/users',
    label: 'View users',
    category: 'Admin',
  },
  {
    method: 'POST',
    path: '/api/v1/users',
    label: 'Create user',
    category: 'Admin',
  },
  {
    method: 'PATCH',
    path: '/api/v1/users/:userId/reset-password',
    label: 'Reset user password',
    category: 'Admin',
  },
  {
    method: 'DELETE',
    path: '/api/v1/users/:userId',
    label: 'Delete user',
    category: 'Admin',
  },

  // ── Role: 3 ────────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/roles',
    label: 'View roles',
    category: 'Role',
  },
  {
    method: 'POST',
    path: '/api/v1/roles',
    label: 'Create role',
    category: 'Role',
  },
  {
    method: 'PATCH',
    path: '/api/v1/roles/:roleId',
    label: 'Edit role',
    category: 'Role',
  },
];
