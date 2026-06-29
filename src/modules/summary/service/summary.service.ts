import { Injectable, Logger } from '@nestjs/common';
import { minsToHHMM, minsToHHMMSS, msToHHMM, msToHHMMSS } from 'src/common/utils/time.utils';
import { filterParamsDecoder } from 'src/common/utils/params-decoder';
import { SummaryRepository } from '../repositroy/summary.repository';

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

const TICKET_STATUS_ORDER = [
  'Open', 'In Progress', 'Developed', 'QA In Progress',
  'Ready for Release', 'Released', 'Closed',
];

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(private readonly summaryRepository: SummaryRepository) {}

  async getUserSummary(filter?: string) {
    try {
      const now = new Date();
      const { userFilterMatch, taskFilterMatch } = splitUserSummaryFilter(filter);
      const results = await this.summaryRepository.getUserSummaryAgg(userFilterMatch, taskFilterMatch, now);

      const data = results.map((u) => ({
        ...u,
        estimatedTime: minsToHHMM(u.estimatedTime ?? 0),
        workTime:      msToHHMM(u.workTime ?? 0),
      }));

      return { success: true, message: 'User summary fetched successfully', data };
    } catch (err) {
      this.logger.error('SummaryService.getUserSummary failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async getTicketSummary(filter?: string) {
    try {
      const now = new Date();
      const normalizedFilter = filter?.replace(/projectIds/g, 'projects');
      const filterMatch = normalizedFilter && normalizedFilter !== '{}'
        ? filterParamsDecoder(normalizedFilter)
        : null;

      const [result] = await this.summaryRepository.getTicketSummaryAgg(filterMatch, now);

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

      return {
        success: true,
        message: 'Ticket summary fetched successfully',
        data: {
          totalTicket: result.total?.[0]?.count ?? 0,
          priority: {
            totalLow:       priorityMap['Low']       ?? 0,
            totalMedium:    priorityMap['Medium']    ?? 0,
            totalHigh:      priorityMap['High']      ?? 0,
            totalEmergency: priorityMap['Emergency'] ?? 0,
          },
          statuses: {
            totalOpen:            statusMap['Open']              ?? 0,
            totalInProgress:      statusMap['In Progress']       ?? 0,
            totalDeveloped:       statusMap['Developed']         ?? 0,
            totalQAInProgress:    statusMap['QA In Progress']    ?? 0,
            totalReadyForRelease: statusMap['Ready for Release'] ?? 0,
            totalReleased:        statusMap['Released']          ?? 0,
            totalClosed:          statusMap['Closed']            ?? 0,
            totalOverdue:         result.overdue?.[0]?.count     ?? 0,
          },
          ticketType: {
            feature:     typeMap['feature']     ?? 0,
            bug:         typeMap['bug']         ?? 0,
            improvement: typeMap['improvement'] ?? 0,
          },
          totalEstimatedTime: minsToHHMM(timeTotals?.totalEstimatedMins ?? 0),
          totalWorkTime:      msToHHMM(timeTotals?.totalWorktimeMs      ?? 0),
        },
      };
    } catch (err) {
      this.logger.error('SummaryService.getTicketSummary failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async getTaskSummary(filter?: string) {
    try {
      const now = new Date();
      const filterMatch = filter && filter !== '{}' ? filterParamsDecoder(filter) : null;
      const [result] = await this.summaryRepository.getTaskSummaryAgg(filterMatch, now);

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
          priority: {
            low:       priorityMap['Low']       ?? 0,
            mid:       priorityMap['Medium']    ?? 0,
            high:      priorityMap['High']      ?? 0,
            emergency: priorityMap['Emergency'] ?? 0,
          },
          statuses: {
            toDo:       statusMap['Todo']          ?? 0,
            overdue:    result.overdue?.[0]?.count ?? 0,
            inProgress: statusMap['In Progress']   ?? 0,
            completed:  statusMap['Completed']     ?? 0,
          },
        },
      };
    } catch (err) {
      this.logger.error('SummaryService.getTaskSummary failed', err instanceof Error ? err.stack : err);
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
        totalWorktimeMs    += r.worktimeMs;
        totalEstimatedMins += r.estimatedMins;
        const p = r.ticket.priority as string;
        const s = r.ticket.status as string;
        priorityMap[p] = (priorityMap[p] ?? 0) + 1;
        statusMap[s]   = (statusMap[s]   ?? 0) + 1;
      }

      const statuses = TICKET_STATUS_ORDER
        .filter((s) => statusMap[s] !== undefined)
        .map((s) => ({
          status:       s,
          totalTickets: statusMap[s],
          percentage:   totalTickets > 0 ? Math.round((statusMap[s] / totalTickets) * 100) : 0,
        }));

      return {
        success: true,
        message: 'Ticket summary fetched successfully',
        data: {
          totalTickets,
          priority: {
            low:       priorityMap['Low']       ?? 0,
            mid:       priorityMap['Medium']    ?? 0,
            high:      priorityMap['High']      ?? 0,
            emergency: priorityMap['Emergency'] ?? 0,
          },
          statuses,
          time: {
            workTime:      msToHHMMSS(totalWorktimeMs),
            estimatedTime: minsToHHMMSS(totalEstimatedMins),
          },
        },
      };
    } catch (err) {
      this.logger.error('SummaryService.getCurrentUserTicketSummary failed', err instanceof Error ? err.stack : err);
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
            low:       priorityMap['Low']       ?? 0,
            mid:       priorityMap['Medium']    ?? 0,
            high:      priorityMap['High']      ?? 0,
            emergency: priorityMap['Emergency'] ?? 0,
          },
          statuses: {
            toDo:       statusMap['Todo']          ?? 0,
            overdue:    result.overdue?.[0]?.count ?? 0,
            inProgress: statusMap['In Progress']   ?? 0,
            completed:  statusMap['Completed']     ?? 0,
          },
        },
      };
    } catch (err) {
      this.logger.error('SummaryService.getCurrentUserTaskSummary failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async getCurrentUserTasks(userId: string, page: number, limit: number, filter?: string) {
    try {
      const skip = (page - 1) * limit;
      const filterMatch = filter && filter !== '{}' ? filterParamsDecoder(filter) : null;
      const [result] = await this.summaryRepository.getUserTasksAgg(userId, skip, limit, filterMatch);

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
      this.logger.error('SummaryService.getCurrentUserTasks failed', err instanceof Error ? err.stack : err);
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
            date:              r._id,
            workTimeHour:      Math.round((r.worktimeMs / 3_600_000) * 100) / 100,
            estimatedTimeHour: Math.round((r.estimatedTimeMins / 60) * 100) / 100,
          })),
        },
      };
    } catch (err) {
      this.logger.error('SummaryService.getWorktimeOverview failed', err instanceof Error ? err.stack : err);
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
            date:              r._id,
            workTimeHour:      Math.round((r.worktimeMs / 3_600_000) * 100) / 100,
            estimatedTimeHour: Math.round((r.estimatedTimeMins / 60) * 100) / 100,
          })),
        },
      };
    } catch (err) {
      this.logger.error('SummaryService.getCurrentUserWorktimeOverview failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async getCurrentUserActiveTicket(userId: string) {
    try {
      const result = await this.summaryRepository.getUserActiveTicketAgg(userId);
      return { success: true, message: 'Active ticket fetched successfully', data: result ?? null };
    } catch (err) {
      this.logger.error('SummaryService.getCurrentUserActiveTicket failed', err instanceof Error ? err.stack : err);
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
      this.logger.error('SummaryService.getCurrentUserActiveTask failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }
}
