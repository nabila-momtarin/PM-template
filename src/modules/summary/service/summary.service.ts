import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { minsToHHMM, minsToHHMMSS, msToHHMM, msToHHMMSS } from 'src/common/utils/time.utils';
import { filterParamsDecoder, extractFromFilter } from 'src/common/utils/params-decoder';
import { SummaryRepository } from '../repositroy/summary.repository';
import { getWorkingDaysCount } from 'src/common/utils/date.util';
import { Types } from 'mongoose';
import { TicketPriority, TicketStatus, TicketType } from 'src/common/enums/ticket.enum';
import { TaskStatus } from 'src/common/enums/task.enum';

const USER_LEVEL_FIELDS = new Set(['assignee', 'name']);

function splitUserSummaryFilter(filter: string | undefined): {
  userFilterMatch: Record<string, any> | null;
  taskFilterMatch: Record<string, any> | null;
} {
  if (!filter || filter === '{}') return { userFilterMatch: null, taskFilterMatch: null };

  try {
    const raw = JSON.parse(filter.replace(/'/g, '"'));
    const andGroup: Record<string, any> = raw.and ?? {};

    const userAnd: Record<string, any> = {};
    const taskAnd: Record<string, any> = {};

    for (const [key, value] of Object.entries(andGroup)) {
      const fieldBase = key.split('__')[0];
      if (USER_LEVEL_FIELDS.has(fieldBase)) {
        const mappedKey = fieldBase === 'assignee' ? key.replace('assignee', '_id') : key;
        userAnd[mappedKey] = value;
      } else {
        taskAnd[key] = value;
      }
    }

    return {
      userFilterMatch: Object.keys(userAnd).length
        ? filterParamsDecoder(JSON.stringify({ and: userAnd }))
        : null,
      taskFilterMatch: Object.keys(taskAnd).length
        ? filterParamsDecoder(JSON.stringify({ and: taskAnd }))
        : null,
    };
  } catch {
    return { userFilterMatch: null, taskFilterMatch: null };
  }
}

// // ── filter string decode করে দুইটা জিনিস বের করা: ──
// // 1) taskMatch/ticketMatch — Mongo $match-ready object (projectId/userId/dueDate থেকে)
// // 2) startDate/endDate/hasFullRange — officeHour ও anomaly/ignored হিসাবের জন্য raw Date
// function parseDashboardFilter(filterRaw?: string) {
//   const decoded = filterRaw ? JSON.parse(decodeURIComponent(filterRaw)) : {};
//   // ── filter object-এ "and" অথবা "or" — যেকোনো একটা top-level key থাকতে পারে, দুটো একসাথে না ──
//   // দুটো একসাথে দিলে কোনটা apply হবে সেটা ambiguous, তাই silently pick না করে fail-fast করা হচ্ছে
//   if ('and' in decoded && 'or' in decoded) {
//     throw new BadRequestException('filter must contain either "and" or "or", not both');
//   }
//   const isOr = 'or' in decoded;
//   const group = decoded.and ?? decoded.or ?? {};
//   const mongoOp = isOr ? '$or' : '$and'; // key যা-ই হোক, সেই অনুযায়ী Mongo operator বসবে
//   const { projectId, userId } = group;
//   // exact date দিলে gte/lte দুটোই সেই date হয়ে যাবে (single-day range)
//   const gte = group['task.dueDate__gte'] ?? group['task.dueDate'];
//   const lte = group['task.dueDate__lte'] ?? group['task.dueDate'];
//   const startDate = gte ? new Date(new Date(gte).setHours(0, 0, 0, 0)) : undefined;
//   const endDate = lte ? new Date(new Date(lte).setHours(23, 59, 59, 999)) : undefined;
//   const dueDateCond =
//     startDate || endDate
//       ? { dueDate: { ...(startDate && { $gte: startDate }), ...(endDate && { $lte: endDate }) } }
//       : null;
//   // Task: projectId, assignee, dueDate — group-এর key অনুযায়ী $and বা $or সেমান্টিক্স
//   const taskConditions = [
//     ...(projectId ? [{ projectId: new Types.ObjectId(projectId) }] : []),
//     ...(userId ? [{ assignee: new Types.ObjectId(userId) }] : []),
//     ...(dueDateCond ? [dueDateCond] : []),
//   ];
//   // NOTE: Ticket-এর জন্য আলাদা match আর বানানো হচ্ছে না —
//   // "task is the base" concept অনুযায়ী, matched task-গুলোর parent ticketId দিয়েই
//   // Ticket section scope হবে (service-এ taskFacet রেজাল্ট থেকে)
//   return {
//     taskMatch: { isDeleted: false, ...(taskConditions.length && { [mongoOp]: taskConditions }) },
//     startDate,
//     endDate,
//     hasFullRange: !!(startDate && endDate), // range না থাকলে officeHour/anomaly/ignored => null
//   };
// }


// ── filter string decode করে taskMatch + date range বের করা ──
// এই endpoint-এর filter shape fixed (projectId/userId/dueDate), তাই generic decoder না, সরাসরি parse
function parseDashboardFilter(filterRaw?: string) {
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

const TICKET_STATUS_ORDER = [
  'Open',
  'In Progress',
  'Developed',
  'QA In Progress',
  'Ready for Release',
  'Released',
  'Closed',
];

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(private readonly summaryRepository: SummaryRepository) {}

  async getUserSummary(filter?: string, startDate?: string, endDate?: string) {
    try {
      const now = new Date();
      const { userFilterMatch, taskFilterMatch } = splitUserSummaryFilter(filter);
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      const results = await this.summaryRepository.getUserSummaryAgg(
        userFilterMatch,
        taskFilterMatch,
        now,
        start,
        end,
      );

      const data = results.map((u) => ({
        ...u,
        estimatedTime: minsToHHMM(u.estimatedTime ?? 0),
        workTime: msToHHMM(u.workTime ?? 0),
      }));

      return { success: true, message: 'User summary fetched successfully', data };
    } catch (err) {
      this.logger.error(
        'SummaryService.getUserSummary failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getTicketSummary(filter?: string, startDate?: string, endDate?: string) {
    try {
      const now = new Date();
      const normalizedFilter = filter?.replace(/projectIds/g, 'projects');

      // Extract assignee separately — tickets have no direct assignee field; filter via task lookup
      const assigneeIdStr = normalizedFilter
        ? (extractFromFilter(normalizedFilter, 'assignee') ?? undefined)
        : undefined;

      // Remove assignee from ticket-level filter
      let ticketFilter = normalizedFilter;
      if (assigneeIdStr && normalizedFilter) {
        try {
          const parsed = JSON.parse(normalizedFilter.replace(/'/g, '"'));
          if (parsed.and && !Array.isArray(parsed.and)) {
            const cleaned = Object.fromEntries(
              Object.entries(parsed.and as Record<string, any>).filter(
                ([k]) => k !== 'assignee' && !k.startsWith('assignee__'),
              ),
            );
            ticketFilter = JSON.stringify({ ...parsed, and: cleaned });
          }
        } catch {
          /* keep original */
        }
      }

      const filterMatch =
        ticketFilter && ticketFilter !== '{}' ? filterParamsDecoder(ticketFilter) : null;

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const [ticketResults, extraTotals] = await Promise.all([
        this.summaryRepository.getTicketSummaryAgg(filterMatch, now, start, end, assigneeIdStr),
        start && end
          ? this.summaryRepository.getExtraTimeTotalsAgg(filterMatch, start, end, assigneeIdStr)
          : Promise.resolve(null),
      ]);
      const [result] = ticketResults;

      const priorityMap = Object.fromEntries(
        (result.byPriority ?? []).map((p: any) => [p._id, p.count]),
      );
      const statusMap = Object.fromEntries(
        (result.byStatus ?? []).map((s: any) => [s._id, s.count]),
      );
      const typeMap = Object.fromEntries(
        (result.byType ?? []).map((t: any) => [(t._id as string)?.toLowerCase(), t.count]),
      );
      const timeTotals = result.timeTotals?.[0];

      const data: Record<string, any> = {
        totalTicket: result.total?.[0]?.count ?? 0,
        priority: {
          totalLow: priorityMap['Low'] ?? 0,
          totalMedium: priorityMap['Medium'] ?? 0,
          totalHigh: priorityMap['High'] ?? 0,
          totalEmergency: priorityMap['Emergency'] ?? 0,
        },
        statuses: {
          totalOpen: statusMap['Open'] ?? 0,
          totalInProgress: statusMap['In Progress'] ?? 0,
          totalDeveloped: statusMap['Developed'] ?? 0,
          totalQAInProgress: statusMap['QA In Progress'] ?? 0,
          totalReadyForRelease: statusMap['Ready for Release'] ?? 0,
          totalReleased: statusMap['Released'] ?? 0,
          totalClosed: statusMap['Closed'] ?? 0,
          totalOverdue: result.overdue?.[0]?.count ?? 0,
        },
        ticketType: {
          feature: typeMap['feature'] ?? 0,
          bug: typeMap['bug'] ?? 0,
          improvement: typeMap['improvement'] ?? 0,
        },
        totalEstimatedTime: minsToHHMM(timeTotals?.totalEstimatedMins ?? 0),
        totalWorkTime: msToHHMM(timeTotals?.totalWorktimeMs ?? 0),
      };

      if (start && end) {
        const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        data.totalHours = days * 8;
        data.totalExtraEstimatedTime = minsToHHMM(extraTotals?.totalExtraEstimatedMins ?? 0);
        data.totalExtraWorkTime = msToHHMM(extraTotals?.totalExtraWorktimeMs ?? 0);
      }

      return { success: true, message: 'Ticket summary fetched successfully', data };
    } catch (err) {
      this.logger.error(
        'SummaryService.getTicketSummary failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getTaskSummary(filter?: string, startDate?: string, endDate?: string, sort?: string) {
    try {
      const now = new Date();
      const filterMatch = filter && filter !== '{}' ? filterParamsDecoder(filter) : null;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      const [result] = await this.summaryRepository.getTaskSummaryAgg(filterMatch, now, start, end);

      const priorityMap = Object.fromEntries(
        (result.byPriority ?? []).map((p: any) => [p._id, p.count]),
      );
      const statusMap = Object.fromEntries(
        (result.byStatus ?? []).map((s: any) => [s._id, s.count]),
      );

      const data: Record<string, any> = {
        priority: {
          low: priorityMap['Low'] ?? 0,
          mid: priorityMap['Medium'] ?? 0,
          high: priorityMap['High'] ?? 0,
          emergency: priorityMap['Emergency'] ?? 0,
        },
        statuses: {
          toDo: statusMap['Todo'] ?? 0,
          overdue: result.overdue?.[0]?.count ?? 0,
          inProgress: statusMap['In Progress'] ?? 0,
          completed: statusMap['Completed'] ?? 0,
        },
        overloadedUsers: { totalUser: 0, userList: [] },
        availableUsers: { totalUser: 0, userList: [] },
        anomalyTotalTask: 0,
      };

      if (start && end) {
        const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const capacityMs = days * 8 * 3_600_000;

        const [userWorktimes, anomalyCount] = await Promise.all([
          this.summaryRepository.getUserWorktimeInRangeAgg(start, end, sort),
          this.summaryRepository.getAnomalyTaskCount(start, end),
        ]);

        const overloadedList = userWorktimes.filter((u) => u.totalWorktimeMs > capacityMs * 0.7);
        const availableList = userWorktimes.filter((u) => u.totalWorktimeMs < capacityMs * 0.5);

        const strip = ({ totalWorktimeMs: _, createdAt: __, ...u }: any) => u;

        data.overloadedUsers = {
          totalUser: overloadedList.length,
          userList: overloadedList.map(strip),
        };
        data.availableUsers = {
          totalUser: availableList.length,
          userList: availableList.map(strip),
        };
        data.anomalyTotalTask = anomalyCount;
      }

      const assigneeIdStr = extractFromFilter(filter, 'assignee');
      if (assigneeIdStr) {
        const user = await this.summaryRepository.getUserById(assigneeIdStr);
        if (user) {
          data.user = { id: user._id, name: user.name, photo: user.photo, email: user.email };
        }
      }

      return { success: true, message: 'Task summary fetched successfully', data };
    } catch (err) {
      this.logger.error(
        'SummaryService.getTaskSummary failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getCurrentUserTicketSummary(userId: string) {
    try {
      const rows = await this.summaryRepository.getUserTicketSummaryAgg(userId);

      const totalTickets = rows.length;
      let totalWorktimeMs = 0;
      let totalEstimatedMins = 0;
      const priorityMap: Record<string, number> = {};
      const statusMap: Record<string, number> = {};

      for (const r of rows) {
        totalWorktimeMs += r.worktimeMs;
        totalEstimatedMins += r.estimatedMins;
        const p = r.ticket.priority as string;
        const s = r.ticket.status as string;
        priorityMap[p] = (priorityMap[p] ?? 0) + 1;
        statusMap[s] = (statusMap[s] ?? 0) + 1;
      }

      const statuses = TICKET_STATUS_ORDER.filter((s) => statusMap[s] !== undefined).map((s) => ({
        status: s,
        totalTickets: statusMap[s],
        percentage: totalTickets > 0 ? Math.round((statusMap[s] / totalTickets) * 100) : 0,
      }));

      return {
        success: true,
        message: 'Ticket summary fetched successfully',
        data: {
          totalTickets,
          priority: {
            low: priorityMap['Low'] ?? 0,
            mid: priorityMap['Medium'] ?? 0,
            high: priorityMap['High'] ?? 0,
            emergency: priorityMap['Emergency'] ?? 0,
          },
          statuses,
          time: {
            workTime: msToHHMMSS(totalWorktimeMs),
            estimatedTime: minsToHHMMSS(totalEstimatedMins),
          },
        },
      };
    } catch (err) {
      this.logger.error(
        'SummaryService.getCurrentUserTicketSummary failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getCurrentUserTaskSummary(userId: string) {
    try {
      const now = new Date();
      const [result] = await this.summaryRepository.getUserTaskSummaryAgg(userId, now);

      const priorityMap = Object.fromEntries(
        (result.byPriority ?? []).map((p: any) => [p._id, p.count]),
      );
      const statusMap = Object.fromEntries(
        (result.byStatus ?? []).map((s: any) => [s._id, s.count]),
      );

      return {
        success: true,
        message: 'Task summary fetched successfully',
        data: {
          totalTasks: result.total?.[0]?.count ?? 0,
          priority: {
            low: priorityMap['Low'] ?? 0,
            mid: priorityMap['Medium'] ?? 0,
            high: priorityMap['High'] ?? 0,
            emergency: priorityMap['Emergency'] ?? 0,
          },
          statuses: {
            toDo: statusMap['Todo'] ?? 0,
            overdue: result.overdue?.[0]?.count ?? 0,
            inProgress: statusMap['In Progress'] ?? 0,
            completed: statusMap['Completed'] ?? 0,
          },
        },
      };
    } catch (err) {
      this.logger.error(
        'SummaryService.getCurrentUserTaskSummary failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getCurrentUserTasks(userId: string, page: number, limit: number, filter?: string) {
    try {
      const skip = (page - 1) * limit;
      const filterMatch = filter && filter !== '{}' ? filterParamsDecoder(filter) : null;
      const [result] = await this.summaryRepository.getUserTasksAgg(
        userId,
        skip,
        limit,
        filterMatch,
      );

      const totalItems = result.total?.[0]?.count ?? 0;
      const items = (result.items ?? []).map((item: any, index: number) => ({
        sl: skip + index + 1,
        ...item,
      }));

      return {
        success: true,
        message: 'Focus tasks fetched successfully',
        data: {
          items,
          pagination: {
            totalItems,
            totalPages: Math.ceil(totalItems / limit) || 1,
            currentPage: page,
            pageSize: limit,
          },
        },
      };
    } catch (err) {
      this.logger.error(
        'SummaryService.getCurrentUserTasks failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getWorktimeOverview(startDate?: string, endDate?: string) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const results = await this.summaryRepository.getWorktimeOverviewAgg(start, end);

      return {
        success: true,
        message: 'Worktime overview fetched successfully',
        data: {
          items: results.map((r) => ({
            date: r._id,
            workTimeHour: Math.round((r.worktimeMs / 3_600_000) * 100) / 100,
            estimatedTimeHour: Math.round((r.estimatedTimeMins / 60) * 100) / 100,
          })),
        },
      };
    } catch (err) {
      this.logger.error(
        'SummaryService.getWorktimeOverview failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getCurrentUserWorktimeOverview(userId: string, startDate?: string, endDate?: string) {
    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const results = await this.summaryRepository.getUserWorktimeOverviewAgg(userId, start, end);

      return {
        success: true,
        message: 'Worktime overview fetched successfully',
        data: {
          items: results.map((r) => ({
            date: r._id,
            workTimeHour: Math.round((r.worktimeMs / 3_600_000) * 100) / 100,
            estimatedTimeHour: Math.round((r.estimatedTimeMins / 60) * 100) / 100,
          })),
        },
      };
    } catch (err) {
      this.logger.error(
        'SummaryService.getCurrentUserWorktimeOverview failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getCurrentUserActiveTicket(userId: string) {
    try {
      const result = await this.summaryRepository.getUserActiveTicketAgg(userId);
      return { success: true, message: 'Active ticket fetched successfully', data: result ?? null };
    } catch (err) {
      this.logger.error(
        'SummaryService.getCurrentUserActiveTicket failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getCurrentUserActiveTask(userId: string) {
    try {
      const task = await this.summaryRepository.findUserActiveTask(userId);

      if (!task) {
        return { success: true, message: 'Active task fetched successfully', data: null };
      }

      const { ticketId, ...rest } = task as any;
      return {
        success: true,
        message: 'Active task fetched successfully',
        data: { ...rest, ticket: ticketId ?? null },
      };
    } catch (err) {
      this.logger.error(
        'SummaryService.getCurrentUserActiveTask failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  // dashboard summary for admin only view
  // async getDashboardSummaries() {
  //   try {
  //     const result = await this.summaryRepository.getDashboardSummaryAgg();
  //     return { success: true, message: 'Dashboard summary fetched successfully', data: result ?? null };
  //   } catch (err) {
  //     this.logger.error('SummaryService.getDashboardSummary failed', err instanceof Error ? err.stack : err);
  //     throw err;
  //   }
  // }

  // async getDashboardSummaries(filterRaw?: string) {
  //   try {
  //     // STEP 1 — filter parse করে taskMatch + date range বের করা
  //     const { taskMatch, startDate, endDate, hasFullRange } = parseDashboardFilter(filterRaw);
  //     const now = new Date();

  //     // STEP 2 — Task = base. আগে Task facet চালাই (এখান থেকেই Ticket-এর scope বের হবে)
  //     const [taskFacet] = await this.summaryRepository.getDashboardTaskFacet(
  //       taskMatch,
  //       now,
  //       hasFullRange,
  //       startDate,
  //       endDate,
  //     );

  //     // STEP 2b — matched task-গুলোর parent ticketId দিয়ে Ticket section scope করা
  //     // (তোমার concept অনুযায়ী: "main base hocche task" — ticket count = matched task-দের parent ticket)
  //     const matchedTicketIds: Types.ObjectId[] =
  //       taskFacet.ticketIds?.[0]?.ids?.filter(Boolean) ?? [];
  //     const ticketMatch = { isDeleted: false, _id: { $in: matchedTicketIds } };

  //     const [ticketFacet] = await this.summaryRepository.getDashboardTicketFacet(ticketMatch);

  //     // STEP 3 — aggregation array results থেকে lookup map বানানো (status/priority count বের করতে)
  //     const taskPriorityMap = Object.fromEntries(
  //       (taskFacet.byPriority ?? []).map((p: any) => [p._id, p.count]),
  //     );
  //     const taskStatusMap = Object.fromEntries(
  //       (taskFacet.byStatus ?? []).map((s: any) => [s._id, s.count]),
  //     );
  //     const workload = taskFacet.workload?.[0];
  //     const officeHour = hasFullRange ? getWorkingDaysCount(startDate!, endDate!) * 8 : null;

  //     // STEP 4 — overloaded vs available user ভাগ করা
  //     //          (heavy aggregation থেকে শুধু userId + estimatedTime sum এসেছে, এখানে শুধু compare)
  //     let overloadedUsers = { totalUser: 0, userList: [] as any[] };
  //     let availableUsers = { totalUser: 0, userList: [] as any[] };

  //     if (hasFullRange) {
  //       const officeHourMins = officeHour! * 60;
  //       const overloadedIds: Types.ObjectId[] = [];
  //       const availableIds: Types.ObjectId[] = [];

  //       for (const u of taskFacet.userWorkload ?? []) {
  //         if (!u._id) continue;
  //         (u.totalEstimatedMins > officeHourMins ? overloadedIds : availableIds).push(u._id);
  //       }

  //       // STEP 4b — হালকা separate lookup দিয়ে নাম/ইমেইল/ছবি আনা (facet-এর ভিতরে $lookup না দিয়ে, lighter)
  //       const allIds = [...overloadedIds, ...availableIds];
  //       const users = allIds.length ? await this.summaryRepository.getUsersByIds(allIds) : [];
  //       const userMap = new Map(users.map((u: any) => [String(u._id), u]));

  //       overloadedUsers = {
  //         totalUser: overloadedIds.length,
  //         userList: overloadedIds.map((id) => userMap.get(String(id))).filter(Boolean),
  //       };
  //       availableUsers = {
  //         totalUser: availableIds.length,
  //         userList: availableIds.map((id) => userMap.get(String(id))).filter(Boolean),
  //       };
  //     }

  //     // STEP 5 — ticket-side lookup maps
  //     const ticketPriorityMap = Object.fromEntries(
  //       (ticketFacet.byPriority ?? []).map((p: any) => [p._id, p.count]),
  //     );
  //     const ticketStatusMap = Object.fromEntries(
  //       (ticketFacet.byStatus ?? []).map((s: any) => [s._id, s.count]),
  //     );
  //     const ticketTypeMap = Object.fromEntries(
  //       (ticketFacet.byType ?? []).map((t: any) => [(t._id as string)?.toLowerCase(), t.count]),
  //     );

  //     const anomalyBranch = hasFullRange ? taskFacet.anomalyTask?.[0] : null;
  //     const ignoredBranch = hasFullRange ? taskFacet.ignoredTask?.[0] : null;

  //     // STEP 6 — final response shape (PDF doc-এর structure অনুযায়ী)
  //     return {
  //       success: true,
  //       message: 'Dashboard summary fetched successfully',
  //       data: {
  //         tasks: {
  //           totalTasks: taskFacet.total?.[0]?.count ?? 0,
  //           priority: {
  //             low: taskPriorityMap[TicketPriority.LOW] ?? 0,
  //             mid: taskPriorityMap[TicketPriority.MEDIUM] ?? 0,
  //             high: taskPriorityMap[TicketPriority.HIGH] ?? 0,
  //             emergency: taskPriorityMap[TicketPriority.EMERGENCY] ?? 0,
  //           },
  //           statuses: {
  //             toDo: taskStatusMap[TaskStatus.TODO] ?? 0,
  //             overdue: taskFacet.overdue?.[0]?.count ?? 0,
  //             inProgress: taskStatusMap[TaskStatus.IN_PROGRESS] ?? 0,
  //             completed: taskStatusMap[TaskStatus.COMPLETED] ?? 0,
  //           },
  //           workload: {
  //             officeHour,
  //             estimatedTime: hasFullRange ? minsToHHMM(workload?.totalEstimatedMins ?? 0) : null,
  //             workTime: hasFullRange ? msToHHMM(workload?.totalWorktimeMs ?? 0) : null,
  //           },
  //           // NOTE: repository-তে nested $facet সরিয়ে $group দেওয়ায় shape সহজ হয়েছে —

  //           tickets: {
  //             totalTickets: ticketFacet.total?.[0]?.count ?? 0,
  //             priority: {
  //               low: ticketPriorityMap[TicketPriority.LOW] ?? 0,
  //               mid: ticketPriorityMap[TicketPriority.MEDIUM] ?? 0,
  //               high: ticketPriorityMap[TicketPriority.HIGH] ?? 0,
  //               emergency: ticketPriorityMap[TicketPriority.EMERGENCY] ?? 0,
  //             },
  //             statuses: {
  //               open: ticketStatusMap[TicketStatus.OPEN] ?? 0,
  //               inProgress: ticketStatusMap[TicketStatus.IN_PROGRESS] ?? 0,
  //               developed: ticketStatusMap[TicketStatus.DEVELOPED] ?? 0,
  //               qaInProgress: ticketStatusMap[TicketStatus.QA_IN_PROGRESS] ?? 0,
  //               readyToRelease: ticketStatusMap[TicketStatus.READY_FOR_RELEASE] ?? 0,
  //               released: ticketStatusMap[TicketStatus.RELEASED] ?? 0,
  //               closed: ticketStatusMap[TicketStatus.CLOSED] ?? 0,
  //             },
  //             type: {
  //               bug: ticketTypeMap[TicketType.BUG.toLowerCase()] ?? 0,
  //               feature: ticketTypeMap[TicketType.FEATURE.toLowerCase()] ?? 0,
  //               improvement: ticketTypeMap[TicketType.IMPROVEMENT.toLowerCase()] ?? 0,
  //             },
  //           },
  //           anomalyTask: {
  //             totalCount: hasFullRange ? (anomalyBranch?.totalCount ?? 0) : null,
  //             list: anomalyBranch?.list ?? [],
  //           },
  //           ignoredTask: {
  //             totalCount: hasFullRange ? (ignoredBranch?.totalCount ?? 0) : null,
  //             list: ignoredBranch?.list ?? [],
  //           },
  //         },

  //         taskHistory: (taskFacet.taskHistory ?? []).map((h: any) => ({
  //           date: h._id,
  //           totalEstimatedTime: minsToHHMM(h.totalEstimatedMins ?? 0),
  //           totalWorkTime: msToHHMM(h.totalWorkTimeMs ?? 0),
  //         })),
  //         overloadedUsers,
  //         availableUsers,
  //       },
  //     };
  //   } catch (err) {
  //     this.logger.error(
  //       'SummaryService.getDashboardSummaries failed',
  //       err instanceof Error ? err.stack : err,
  //     );
  //     throw err;
  //   }
  // }

  
async getDashboardSummaries(filterRaw?: string) {
  try {
    // STEP 1 — filter parse
    const { taskMatch, rangeStart, rangeEnd, hasFullRange } = parseDashboardFilter(filterRaw);
    const now = new Date();
 
    // STEP 2 — Call 1: Task facet (base)
    // সব task metric + matched ticketIds + anomalyTaskTicketIds বের হবে
    const [taskFacet] = await this.summaryRepository.getDashboardTaskFacet(
      taskMatch, now, hasFullRange, rangeStart, rangeEnd,
    );
 
    // STEP 3 — Call 2: Ticket facet
    // matchedTicketIds: Task facet থেকে → Ticket section-এর scope (task is base)
    // anomalyTicketIds: Task facet থেকে candidate → Ticket facet verify করবে dueDate > rangeEnd কিনা
    const matchedTicketIds: Types.ObjectId[] = taskFacet.ticketIds?.[0]?.ids?.filter(Boolean) ?? [];
    const anomalyTicketIds: Types.ObjectId[] = hasFullRange
      ? (taskFacet.anomalyTaskTicketIds?.[0]?.ids?.filter(Boolean) ?? [])
      : [];
 
    const [ticketFacet] = await this.summaryRepository.getDashboardTicketFacet(
      { isDeleted: false, _id: { $in: matchedTicketIds } },
      anomalyTicketIds,
      hasFullRange,
      rangeEnd,
    );
 
    // STEP 4 — Call 3: ignoredTicket (conditional — শুধু range থাকলে)
    // আলাদা method কারণ $match আলাদা (dueDate range-based, matchedTicketIds-based না)
    const ignoredResult = hasFullRange
      ? await this.summaryRepository.getIgnoredTickets(rangeStart!, rangeEnd!)
      : [];
    const ignoredBranch = ignoredResult?.[0] ?? null;
 
    // STEP 5 — Call 4: overloaded/available user (conditional — শুধু range থাকলে)
    let overloadedUsers = { totalUser: 0, userList: [] as any[] };
    let availableUsers = { totalUser: 0, userList: [] as any[] };
 
    if (hasFullRange) {
      const officeHourMins = getWorkingDaysCount(rangeStart!, rangeEnd!) * 8 * 60;
      const overloadedIds: Types.ObjectId[] = [];
      const availableIds: Types.ObjectId[] = [];
 
      for (const u of taskFacet.userWorkload ?? []) {
        if (!u._id) continue;
        (u.totalEstimatedMins > officeHourMins ? overloadedIds : availableIds).push(u._id);
      }
 
      const allIds = [...overloadedIds, ...availableIds];
      const users = allIds.length ? await this.summaryRepository.getUsersByIds(allIds) : [];
      const userMap = new Map(users.map((u: any) => [String(u._id), u]));
 
      overloadedUsers = {
        totalUser: overloadedIds.length,
        userList: overloadedIds.map((id) => userMap.get(String(id))).filter(Boolean),
      };
      availableUsers = {
        totalUser: availableIds.length,
        userList: availableIds.map((id) => userMap.get(String(id))).filter(Boolean),
      };
    }
 
    // STEP 6 — lookup maps (array result → key-value, count বের করতে)
    const taskPriorityMap = Object.fromEntries((taskFacet.byPriority ?? []).map((p: any) => [p._id, p.count]));
    const taskStatusMap = Object.fromEntries((taskFacet.byStatus ?? []).map((s: any) => [s._id, s.count]));
    const ticketPriorityMap = Object.fromEntries((ticketFacet.byPriority ?? []).map((p: any) => [p._id, p.count]));
    const ticketStatusMap = Object.fromEntries((ticketFacet.byStatus ?? []).map((s: any) => [s._id, s.count]));
    const ticketTypeMap = Object.fromEntries(
      (ticketFacet.byType ?? []).map((t: any) => [(t._id as string)?.toLowerCase(), t.count]),
    );
 
    const workload = taskFacet.workload?.[0];
    const officeHour = hasFullRange ? getWorkingDaysCount(rangeStart!, rangeEnd!) * 8 : null;
    const anomalyBranch = hasFullRange ? ticketFacet.anomalyTicket?.[0] : null;
 
    // STEP 7 — final response shape
    return {
      success: true,
      message: 'Dashboard summary fetched successfully',
      data: {
        tasks: {
          totalTasks: taskFacet.total?.[0]?.count ?? 0,
          priority: {
            low: taskPriorityMap[TicketPriority.LOW] ?? 0,
            mid: taskPriorityMap[TicketPriority.MEDIUM] ?? 0,
            high: taskPriorityMap[TicketPriority.HIGH] ?? 0,
            emergency: taskPriorityMap[TicketPriority.EMERGENCY] ?? 0,
          },
          statuses: {
            toDo: taskStatusMap[TaskStatus.TODO] ?? 0,
            overdue: taskFacet.overdue?.[0]?.count ?? 0,
            inProgress: taskStatusMap[TaskStatus.IN_PROGRESS] ?? 0,
            completed: taskStatusMap[TaskStatus.COMPLETED] ?? 0,
          },
          workload: {
            officeHour,
            estimatedTime: hasFullRange ? minsToHHMM(workload?.totalEstimatedMins ?? 0) : null,
            workTime: hasFullRange ? msToHHMM(workload?.totalWorktimeMs ?? 0) : null,
          },
        },
        tickets: {
          totalTickets: ticketFacet.total?.[0]?.count ?? 0,
          priority: {
            low: ticketPriorityMap[TicketPriority.LOW] ?? 0,
            mid: ticketPriorityMap[TicketPriority.MEDIUM] ?? 0,
            high: ticketPriorityMap[TicketPriority.HIGH] ?? 0,
            emergency: ticketPriorityMap[TicketPriority.EMERGENCY] ?? 0,
          },
          statuses: {
            open: ticketStatusMap[TicketStatus.OPEN] ?? 0,
            inProgress: ticketStatusMap[TicketStatus.IN_PROGRESS] ?? 0,
            developed: ticketStatusMap[TicketStatus.DEVELOPED] ?? 0,
            qaInProgress: ticketStatusMap[TicketStatus.QA_IN_PROGRESS] ?? 0,
            readyToRelease: ticketStatusMap[TicketStatus.READY_FOR_RELEASE] ?? 0,
            released: ticketStatusMap[TicketStatus.RELEASED] ?? 0,
            closed: ticketStatusMap[TicketStatus.CLOSED] ?? 0,
          },
          type: {
            bug: ticketTypeMap[TicketType.BUG.toLowerCase()] ?? 0,
            feature: ticketTypeMap[TicketType.FEATURE.toLowerCase()] ?? 0,
            improvement: ticketTypeMap[TicketType.IMPROVEMENT.toLowerCase()] ?? 0,
          },
          // date range না থাকলে null/empty
          anomalyTicket: {
            totalCount: hasFullRange ? (anomalyBranch?.totalCount ?? 0) : null,
            list: anomalyBranch?.list ?? [],
          },
          ignoredTicket: {
            totalCount: hasFullRange ? (ignoredBranch?.totalCount ?? 0) : null,
            list: ignoredBranch?.list ?? [],
          },
        },
        taskHistory: (taskFacet.taskHistory ?? []).map((h: any) => ({
          date: h._id,
          totalEstimatedTime: minsToHHMM(h.totalEstimatedMins ?? 0),
          totalWorkTime: msToHHMM(h.totalWorkTimeMs ?? 0),
        })),
        overloadedUsers,
        availableUsers,
      },
    };
  } catch (err) {
    this.logger.error('SummaryService.getDashboardSummaries failed', err instanceof Error ? err.stack : err);
    throw err;
  }
}
}



