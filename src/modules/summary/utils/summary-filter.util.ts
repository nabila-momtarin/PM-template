import { Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { filterParamsDecoder } from 'src/common/utils/params-decoder';

const USER_LEVEL_FIELDS = new Set(['assignee', 'name']);


// ── userSummary এর filter কে User-level vs Task-level এ split করে ──
export function splitUserSummaryFilter(filter?: string): {
  userFilterMatch: Record<string, any> | null;
  taskFilterMatch: Record<string, any> | null;
} {
  if (!filter || filter === '{}') return { userFilterMatch: null, taskFilterMatch: null };

  const raw = JSON.parse(filter.replace(/'/g, '"'));
  const andGroup: Record<string, any> = raw.and ?? {};

  const userAnd: Record<string, any> = {};
  const taskAnd: Record<string, any> = {};

  for (const [key, value] of Object.entries(andGroup)) {
    const base = key.split('__')[0];
    if (USER_LEVEL_FIELDS.has(base)) {
      userAnd[base === 'assignee' ? key.replace('assignee', '_id') : key] = value;
    } else {
      taskAnd[key] = value;
    }
  }

  return {
    userFilterMatch: Object.keys(userAnd).length ? filterParamsDecoder(JSON.stringify({ and: userAnd })) : null,
    taskFilterMatch: Object.keys(taskAnd).length ? filterParamsDecoder(JSON.stringify({ and: taskAnd })) : null,
  };
}


// ── dashboard/summaries এর জন্য taskMatch + date range বের করে ──
export function parseDashboardFilter(filterRaw?: string) {
  const decoded = filterRaw ? JSON.parse(decodeURIComponent(filterRaw)) : {};
 
  // "and" আর "or" একসাথে দিলে ambiguous — fail-fast
  if ('and' in decoded && 'or' in decoded) {
    throw new BadRequestException('filter must contain either "and" or "or", not both');
  }
 
  const isOr = 'or' in decoded;
  const group = decoded.and ?? decoded.or ?? {};
  const mongoOp = isOr ? '$or' : '$and';
  const { projectId, userId } = group;
 
  // exact date দিলে gte/lte দুটোই সেই date → single-day range
  const gte = group['task.dueDate__gte'] ?? group['task.dueDate'];
  const lte = group['task.dueDate__lte'] ?? group['task.dueDate'];
  const rangeStart = gte ? new Date(new Date(gte).setHours(0, 0, 0, 0)) : undefined;
  const rangeEnd = lte ? new Date(new Date(lte).setHours(23, 59, 59, 999)) : undefined;
 
  const dueDateCond = rangeStart || rangeEnd
    ? { dueDate: { ...(rangeStart && { $gte: rangeStart }), ...(rangeEnd && { $lte: rangeEnd }) } }
    : null;
 
  const taskConditions = [
    ...(projectId ? [{ projectId: new Types.ObjectId(projectId) }] : []),
    ...(userId ? [{ assignee: new Types.ObjectId(userId) }] : []),
    ...(dueDateCond ? [dueDateCond] : []),
  ];
 
  return {
    taskMatch: { isDeleted: false, ...(taskConditions.length && { [mongoOp]: taskConditions }) },
    rangeStart,
    rangeEnd,
    hasFullRange: !!(rangeStart && rangeEnd),
  };
}