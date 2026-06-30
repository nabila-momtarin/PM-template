import { PermissionCatalog } from '../types/permissions.type';

export const PERMISSIONS: PermissionCatalog = [
  // ── Me: 0 ─────────────────────────────────────────────
  // {
  //   method: 'GET',
  //   path: '/api/v1/me',
  //   label: 'View my profile',
  //   category: 'Me',
  // },
  //  {
  //   method: 'GET',
  //   path: '/api/v1/me/my-priority-tasks',
  //   label: 'View my priority tasks',
  //   category: 'Me',
  // },
  //  {
  //   method: 'GET',
  //   path: '/api/v1/me/my-priority-tickets',
  //   label: 'View my priority tickets',
  //   category: 'Me',
  // },
  //  {
  //   method: 'PATCH',
  //   path: '/api/v1/me',
  //   label: 'Update my profile',
  //   category: 'Me',
  // },
  //  {
  //   method: 'PATCH',
  //   path: '/api/v1/me/change-password',
  //   label: 'Change my password',
  //   category: 'Me',
  // },

  // ── Tickets: 20 ─────────────────────────────────────────────
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
    method: 'GET',
    path: '/api/v1/tickets/open',
    label: 'View open tickets',
    category: 'Tickets',
  },
  {
    method: 'GET',
    path: '/api/v1/tickets/in-progress',
    label: 'View in-progress tickets',
    category: 'Tickets',
  },
  {
    method: 'GET',
    path: '/api/v1/tickets/developed',
    label: 'View developed tickets',
    category: 'Tickets',
  },
  {
    method: 'GET',
    path: '/api/v1/tickets/qa-in-progress',
    label: 'View QA in-progress tickets',
    category: 'Tickets',
  },
  {
    method: 'GET',
    path: '/api/v1/tickets/ready-for-release',
    label: 'View ready-for-release tickets',
    category: 'Tickets',
  },
  {
    method: 'GET',
    path: '/api/v1/tickets/released',
    label: 'View released tickets',
    category: 'Tickets',
  },
  {
    method: 'GET',
    path: '/api/v1/tickets/closed',
    label: 'View closed tickets',
    category: 'Tickets',
  },
  {
    method: 'GET',
    path: '/api/v1/tickets/:id',
    label: 'View ticket details',
    category: 'Tickets',
  },
  {
    method: 'DELETE',
    path: '/api/v1/tickets/:id',
    label: 'Delete ticket',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:id',
    label: 'Edit ticket',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:id/due-date',
    label: 'Update ticket due date',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:id/change-qa-status',
    label: 'Change ticket QA status',
    category: 'Tickets',
  },
   {
    method: 'PATCH',
    path: '/api/v1/tickets/:id/change-status/open',
    label: 'Move ticket to Open',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:id/change-status/in-progress',
    label: 'Move ticket to In Progress',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:id/change-status/developed',
    label: 'Move ticket to Developed',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:id/change-status/qa-in-progress',
    label: 'Move ticket to QA In Progress',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:id/change-status/ready-for-release',
    label: 'Move ticket to Ready for Release',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:id/change-status/released',
    label: 'Move ticket to Released',
    category: 'Tickets',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tickets/:id/change-status/closed',
    label: 'Move ticket to Closed',
    category: 'Tickets',
  },

  // ── Projects: 5 ────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/projects',
    label: 'Create project',
    category: 'Projects',
  },
  {
    method: 'GET',
    path: '/api/v1/projects',
    label: 'View projects',
    category: 'Projects',
  },
  {
    method: 'GET',
    path: '/api/v1/projects/:projectId',
    label: 'View project details',
    category: 'Projects',
  },
  {
    method: 'DELETE',
    path: '/api/v1/projects/:projectId',
    label: 'Delete project',
    category: 'Projects',
  },
  {
    method: 'PATCH',
    path: '/api/v1/projects/:projectId',
    label: 'Edit project',
    category: 'Projects',
  },

  // ── Tasks: 9 ───────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/tasks',
    label: 'Create task',
    category: 'Tasks',
  },
  {
    method: 'GET',
    path: '/api/v1/tasks/todo',
    label: 'View todo tasks',
    category: 'Tasks',
  },
  {
    method: 'GET',
    path: '/api/v1/tasks/in-progress',
    label: 'View in-progress tasks',
    category: 'Tasks',
  },
  {
    method: 'GET',
    path: '/api/v1/tasks/completed',
    label: 'View completed tasks',
    category: 'Tasks',
  },
  {
    method: 'GET',
    path: '/api/v1/tasks/:id',
    label: 'View task details',
    category: 'Tasks',
  },
  {
    method: 'DELETE',
    path: '/api/v1/tasks/:id',
    label: 'Delete task',
    category: 'Tasks',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tasks/:id',
    label: 'Edit task',
    category: 'Tasks',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tasks/:id/due-date',
    label: 'Update task due date',
    category: 'Tasks',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tasks/:id/start',
    label: 'Start task timer',
    category: 'Tasks',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tasks/:id/pause',
    label: 'Pause task timer',
    category: 'Tasks',
  },
  {
    method: 'PATCH',
    path: '/api/v1/tasks/:id/complete',
    label: 'Complete task',
    category: 'Tasks',
  },
  {
    method: 'GET',
    path: '/api/v1/tasks',
    label: 'View tasks',
    category: 'Tasks',
  },

  // ── Admin / Users: 5 ───────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/users',
    label: 'Create user',
    category: 'Admin',
  },
  {
    method: 'GET',
    path: '/api/v1/users',
    label: 'View users',
    category: 'Admin',
  },
  {
    method: 'GET',
    path: '/api/v1/users/:id',
    label: 'View user details',
    category: 'Admin',
  },
  {
    method: 'DELETE',
    path: '/api/v1/users/:id',
    label: 'Delete user',
    category: 'Admin',
  },
  // {
  //   method: 'PATCH',
  //   path: '/api/v1/users/:id/reset-password',
  //   label: 'Reset user password',
  //   category: 'Admin',
  // },

    // ── ADMIN/Users Dashboard ──────────────────────────────────────────────────────
  // {
  //   method: 'GET',
  //   path: '/api/v1/userSummary',
  //   label: 'View user summary',
  //   category: 'Admin',
  // },
  // {
  //   method: 'GET',
  //   path: '/api/v1/ticketSummary',
  //   label: 'View ticket summary',
  //   category: 'Admin',
  // },
  // {
  //   method: 'GET',
  //   path: '/api/v1/taskSummary',
  //   label: 'View task summary',
  //   category: 'Admin',
  // },

  // ── Dashboard: 10 ─────────────────────────────────────────
  {
    method: 'GET',
    path: '/api/v1/dashboard/me/active-task',
    label: 'View my active task',
    category: 'Dashboard',
  },
  {
    method: 'GET',
    path: '/api/v1/dashboard/me/active-ticket',
    label: 'View my active ticket',
    category: 'Dashboard',
  },
  {
    method: 'GET',
    path: '/api/v1/dashboard/me/task-summary',
    label: 'View my task summary',
    category: 'Dashboard',
  },
  {
    method: 'GET',
    path: '/api/v1/dashboard/me/ticket-summary',
    label: 'View my ticket summary',
    category: 'Dashboard',
  },
  {
    method: 'GET',
    path: '/api/v1/dashboard/me/tasks',
    label: 'View my tasks',
    category: 'Dashboard',
  },
  {
    method: 'GET',
    path: '/api/v1/dashboard/me/worktime',
    label: 'View my worktime overview',
    category: 'Dashboard',
  },

  // ── Roles: 5 ───────────────────────────────────────────────
  {
    method: 'POST',
    path: '/api/v1/roles',
    label: 'Create role',
    category: 'Role',
  },
  {
    method: 'GET',
    path: '/api/v1/roles',
    label: 'View roles',
    category: 'Role',
  },
  {
    method: 'GET',
    path: '/api/v1/roles/:roleId',
    label: 'View role details',
    category: 'Role',
  },
  {
    method: 'DELETE',
    path: '/api/v1/roles/:roleId',
    label: 'Delete role',
    category: 'Role',
  },
  {
    method: 'PATCH',
    path: '/api/v1/roles/:roleId',
    label: 'Edit role',
    category: 'Role',
  },
];
