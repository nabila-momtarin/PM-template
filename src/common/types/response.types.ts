// ── Success Response ──────────────────────────────────────────────────────────
// Used by ResponseInterceptor to wrap all successful controller returns.
// Controllers can return a plain object/array (interceptor wraps it), or
// return a pre-built ApiResponse directly when message/pagination is needed.
//
// Example (plain return — interceptor wraps):
//   return user;
//   → { success: true, data: user }
//
// Example (pre-built — interceptor passes through):
//   return { success: true, message: 'User created', data: user };
//   → { success: true, message: 'User created', data: user }

export interface ApiResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
  pagination?: PaginationMeta;
}

// ── Error Response ────────────────────────────────────────────────────────────
// Produced by HttpExceptionFilter on every thrown exception.
//
// message  → UI-safe string, shown directly to the end user.
// error    → Debug context: e.g. "UserService failed due to: not found".
//            Only populated when there is additional context beyond the message.
//            Keep this field out of user-facing UI.

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface PaginationData {
  request: {
    skip: number;
    limit: number;
  };
  pagination?: PaginationMeta;
}
