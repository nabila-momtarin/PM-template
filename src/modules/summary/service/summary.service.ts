import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { minsToHHMM, minsToHHMMSS, msToHHMM, msToHHMMSS } from 'src/common/utils/time.utils';
import { filterParamsDecoder } from 'src/common/utils/params-decoder';
import { Task, TaskDocument } from 'src/modules/task/entities/task.schema';
import { Ticket, TicketDocument } from 'src/modules/ticket/entities/ticket.schema';
import { User, UserDocument } from 'src/modules/user/entities/user.schema';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    @InjectModel(User.name)   private readonly userModel: Model<UserDocument>,
    @InjectModel(Task.name)   private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
  ) {}

  // ─────────────────────────────────────────
  // USER SUMMARY
  // ─────────────────────────────────────────
  async getUserSummary() {
    const results = await this.userModel.aggregate([
      // Step 1 — only active users
      { $match: { isDeleted: false } },

      // Step 2 — lookup all tasks assigned to each user
      {
        $lookup: {
          from: 'tasks',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$assignee', '$$userId'] },
              { $eq: ['$isDeleted', false] },
            ]}}},
          ],
          as: 'tasks',
        },
      },

      // Step 3 — unwind tasks (keep users with no tasks)
      { $unwind: { path: '$tasks', preserveNullAndEmptyArrays: true } },

      // Step 4 — unwind worktime entries per task
      {
        $unwind: {
          path: '$tasks.worktime',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Step 5 — group by user + task to get per-task worktime ms
      {
        $group: {
          _id: { userId: '$_id', taskId: '$tasks._id' },
          userName:      { $first: '$name' },
          userPhoto:     { $first: '$photo' },
          estimatedTime: { $first: '$tasks.estimatedTime' },
          taskStatus:    { $first: '$tasks.status' },
          taskTitle:     { $first: '$tasks.title' },
          worktimeMs: {
            $sum: {
              $cond: {
                if: { $ifNull: ['$tasks.worktime.startTime', false] },
                then: {
                  $subtract: [
                    { $ifNull: ['$tasks.worktime.endTime', '$$NOW'] },
                    '$tasks.worktime.startTime',
                  ],
                },
                else: 0,
              },
            },
          },
        },
      },

      // Step 6 — group by user to get totals
      {
        $group: {
          _id: '$_id.userId',
          name:               { $first: '$userName' },
          photo:              { $first: '$userPhoto' },
          totalEstimatedMins: { $sum: { $ifNull: ['$estimatedTime', 0] } },
          totalWorktimeMs:    { $sum: '$worktimeMs' },
          totalTaskCount:     { $sum: { $cond: [{ $ifNull: ['$_id.taskId', false] }, 1, 0] } },
          completedTaskCount: {
            $sum: {
              $cond: [{ $eq: ['$taskStatus', 'Completed'] }, 1, 0],
            },
          },
          // running task = first In Progress task
          runningTask: {
            $max: {
              $cond: [
                { $eq: ['$taskStatus', 'In Progress'] },
                { id: '$_id.taskId', name: '$taskTitle' },
                null,
              ],
            },
          },
        },
      },

      // Step 7 — shape final output
      {
        $project: {
          _id: 0,
          userId:             '$_id',
          name:               1,
          photo:              1,
          totalTaskCount:     1,
          completedTaskCount: 1,
          runningTask:        1,
          estimatedTime:      '$totalEstimatedMins',
          workTime:           '$totalWorktimeMs',
        },
      },
    ]);

    // Format times in application layer
    const data = results.map((u) => ({
      ...u,
      estimatedTime: minsToHHMM(u.estimatedTime ?? 0),
      workTime:      msToHHMM(u.workTime ?? 0),
    }));

    this.logger.debug(`User summary: ${JSON.stringify(data)}`);

    return {
      success: true,
      message: 'User summary fetched successfully',
      data,
    };
  }

  // ticketSummary and taskSummary আসছে পরে
async getTicketSummary() {
  const now = new Date();

  const [result] = await this.ticketModel.aggregate([
    { $match: { isDeleted: false } },

    {
      $facet: {
        // ── Priority counts ──
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ],

        // ── Status counts ──
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],

        // ── Total tickets ──
        total: [
          { $count: 'count' },
        ],

        // ── Overdue: dueDate < now AND status != Closed ──
        overdue: [
          {
            $match: {
              dueDate: { $lt: now },
              status: { $ne: 'Closed' },
            },
          },
          { $count: 'count' },
        ],

        // ── Time totals from linked tasks ──
        timeTotals: [
          {
            $lookup: {
              from: 'tasks',
              let: { ticketId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $and: [
                      { $eq: ['$ticketId', '$$ticketId'] },
                      { $eq: ['$isDeleted', false] },
                    ]},
                  },
                },
                { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: false } },
                {
                  $group: {
                    _id: '$_id',
                    estimatedTime: { $first: '$estimatedTime' },
                    worktimeMs: {
                      $sum: {
                        $subtract: [
                          { $ifNull: ['$worktime.endTime', '$$NOW'] },
                          '$worktime.startTime',
                        ],
                      },
                    },
                  },
                },
              ],
              as: 'taskData',
            },
          },
          { $unwind: { path: '$taskData', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              totalEstimatedMins: { $sum: { $ifNull: ['$taskData.estimatedTime', 0] } },
              totalWorktimeMs:    { $sum: { $ifNull: ['$taskData.worktimeMs', 0] } },
            },
          },
        ],
      },
    },
  ]);

  // ── Helper to extract counts ──
  const priorityMap = Object.fromEntries(
    (result.byPriority ?? []).map((p: any) => [p._id, p.count])
  );
  const statusMap = Object.fromEntries(
    (result.byStatus ?? []).map((s: any) => [s._id, s.count])
  );

  const timeTotals = result.timeTotals?.[0];

  return {
    success: true,
    message: 'Ticket summary fetched successfully',
    data: {
      totalTicket:           result.total?.[0]?.count          ?? 0,
      totalLow:              priorityMap['Low']                 ?? 0,
      totalMedium:           priorityMap['Medium']              ?? 0,
      totalHigh:             priorityMap['High']                ?? 0,
      totalEmergency:        priorityMap['Emergency']           ?? 0,
      totalOpen:             statusMap['Open']                  ?? 0,
      totalInProgress:       statusMap['In Progress']           ?? 0,
      totalDeveloped:        statusMap['Developed']             ?? 0,
      totalQAInProgress:     statusMap['QA In Progress']        ?? 0,
      totalReadyForRelease:  statusMap['Ready for Release']     ?? 0,
      totalReleased:         statusMap['Released']              ?? 0,
      totalClosed:           statusMap['Closed']                ?? 0,
      totalOverdue:          result.overdue?.[0]?.count         ?? 0,
      totalEstimatedTime:    minsToHHMM(timeTotals?.totalEstimatedMins ?? 0),
      totalWorkTime:         msToHHMM(timeTotals?.totalWorktimeMs      ?? 0),
    },
  };
}

 async getTaskSummary() {
  const now = new Date();

  const [result] = await this.taskModel.aggregate([
    { $match: { isDeleted: false } },

    {
      $facet: {
        // ── Status counts ──
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],

        // ── Total tasks ──
        total: [
          { $count: 'count' },
        ],

        // ── Overdue: dueDate < now AND status != Completed ──
        overdue: [
          {
            $match: {
              dueDate: { $lt: now },
              status: { $ne: 'Completed' },
            },
          },
          { $count: 'count' },
        ],

        // ── Time totals from worktime entries ──
        timeTotals: [
          { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: '$_id',
              estimatedTime: { $first: '$estimatedTime' },
              worktimeMs: {
                $sum: {
                  $subtract: [
                    { $ifNull: ['$worktime.endTime', '$$NOW'] },
                    '$worktime.startTime',
                  ],
                },
              },
            },
          },
          {
            $group: {
              _id: null,
              totalEstimatedMins: { $sum: { $ifNull: ['$estimatedTime', 0] } },
              totalWorktimeMs:    { $sum: '$worktimeMs' },
            },
          },
        ],
      },
    },
  ]);

  const statusMap = Object.fromEntries(
    (result.byStatus ?? []).map((s: any) => [s._id, s.count])
  );
  const timeTotals = result.timeTotals?.[0];

  return {
    success: true,
    message: 'Task summary fetched successfully',
    data: {
      totalTask:          result.total?.[0]?.count   ?? 0,
      totalTodo:          statusMap['Todo']           ?? 0,
      totalInProgress:    statusMap['In Progress']    ?? 0,
      totalCompleted:     statusMap['Completed']      ?? 0,
      totalOverdue:       result.overdue?.[0]?.count  ?? 0,
      totalEstimatedTime: minsToHHMM(timeTotals?.totalEstimatedMins ?? 0),
      totalWorkTime:      msToHHMM(timeTotals?.totalWorktimeMs      ?? 0),
    },
  };
}

  async getCurrentUserTicketSummary(userId: string) {
    const TICKET_STATUS_ORDER = [
      'Open', 'In Progress', 'Developed', 'QA In Progress',
      'Ready for Release', 'Released', 'Closed',
    ];

    // Start from tasks to find tickets the user is involved in
    const rows = await this.taskModel.aggregate([
      {
        $match: {
          assignee: new Types.ObjectId(userId),
          isDeleted: false,
          ticketId: { $exists: true, $ne: null },
        },
      },
      { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: true } },
      // Group by taskId first to avoid double-counting estimatedTime
      {
        $group: {
          _id: { taskId: '$_id', ticketId: '$ticketId' },
          estimatedMins: { $first: { $ifNull: ['$estimatedTime', 0] } },
          worktimeMs: {
            $sum: {
              $cond: {
                if: { $ifNull: ['$worktime.startTime', false] },
                then: { $subtract: [{ $ifNull: ['$worktime.endTime', '$$NOW'] }, '$worktime.startTime'] },
                else: 0,
              },
            },
          },
        },
      },
      // Group by ticketId to get per-ticket totals
      {
        $group: {
          _id: '$_id.ticketId',
          worktimeMs:    { $sum: '$worktimeMs' },
          estimatedMins: { $sum: '$estimatedMins' },
        },
      },
      {
        $lookup: {
          from: 'tickets',
          localField: '_id',
          foreignField: '_id',
          as: 'ticket',
          pipeline: [
            { $match: { isDeleted: false } },
            { $project: { _id: 0, priority: 1, status: 1 } },
          ],
        },
      },
      { $unwind: { path: '$ticket', preserveNullAndEmptyArrays: false } },
    ]);

    const totalTickets = rows.length;
    let totalWorktimeMs = 0;
    let totalEstimatedMins = 0;
    const priorityMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};

    for (const r of rows) {
      totalWorktimeMs   += r.worktimeMs;
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
  }

  async getCurrentUserTaskSummary(userId: string) {
    const now = new Date();

    const [result] = await this.taskModel.aggregate([
      {
        $match: {
          assignee: new Types.ObjectId(userId),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'tickets',
          localField: 'ticketId',
          foreignField: '_id',
          as: 'ticket',
        },
      },
      {
        $addFields: {
          ticketPriority: { $arrayElemAt: ['$ticket.priority', 0] },
        },
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byPriority: [
            { $group: { _id: '$ticketPriority', count: { $sum: 1 } } },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          overdue: [
            {
              $match: {
                dueDate: { $lt: now },
                status: { $ne: 'Completed' },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

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
          toDo:       statusMap['Todo']        ?? 0,
          overdue:    result.overdue?.[0]?.count ?? 0,
          inProgress: statusMap['In Progress'] ?? 0,
          completed:  statusMap['Completed']   ?? 0,
        },
      },
    };
  }

  async getCurrentUserTasks(userId: string, page: number, limit: number, filter?: string) {
    const skip = (page - 1) * limit;

    const conditions: any[] = [
      { assignee: new Types.ObjectId(userId), isDeleted: false },
    ];
    if (filter && filter !== '{}') {
      conditions.push(filterParamsDecoder(filter));
    }

    const [result] = await this.taskModel.aggregate([
      { $match: { $and: conditions } },
      {
        $lookup: {
          from: 'tickets',
          localField: 'ticketId',
          foreignField: '_id',
          as: 'ticketData',
          pipeline: [{ $project: { _id: 1, ticketNumber: 1, title: 1, priority: 1, dueDate: 1 } }],
        },
      },
      { $addFields: { ticketDoc: { $arrayElemAt: ['$ticketData', 0] } } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                id: '$_id',
                taskNumber: 1,
                title: 1,
                status: 1,
                deadline: '$dueDate',
                priority: '$ticketDoc.priority',
                ticket: {
                  id: '$ticketDoc._id',
                  ticketNumber: '$ticketDoc.ticketNumber',
                  title: '$ticketDoc.title',
                  priority: '$ticketDoc.priority',
                  dueDate: '$ticketDoc.dueDate',
                },
              },
            },
          ],
        },
      },
    ]);

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
  }

  async getWorktimeOverview(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : (() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; })();
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const results = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: false } },
      { $match: { 'worktime.startTime': { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            date:   { $dateToString: { format: '%Y-%m-%d', date: '$worktime.startTime' } },
            taskId: '$_id',
          },
          estimatedTimeMins: { $first: { $ifNull: ['$estimatedTime', 0] } },
          worktimeMs: {
            $sum: {
              $subtract: [
                { $ifNull: ['$worktime.endTime', '$$NOW'] },
                '$worktime.startTime',
              ],
            },
          },
        },
      },
      {
        $group: {
          _id:               '$_id.date',
          worktimeMs:        { $sum: '$worktimeMs' },
          estimatedTimeMins: { $sum: '$estimatedTimeMins' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const items = results.map((r) => ({
      date:              r._id,
      workTimeHour:      Math.round((r.worktimeMs / 3_600_000) * 100) / 100,
      estimatedTimeHour: Math.round((r.estimatedTimeMins / 60) * 100) / 100,
    }));

    return {
      success: true,
      message: 'Worktime overview fetched successfully',
      data: { items },
    };
  }

  async getCurrentUserWorktimeOverview(userId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : (() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; })();
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const results = await this.taskModel.aggregate([
      {
        $match: {
          assignee: new Types.ObjectId(userId),
          isDeleted: false,
        },
      },
      { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'worktime.startTime': { $gte: start, $lte: end },
        },
      },
      // Group by (date + taskId) first — avoids double-counting estimatedTime
      // when a task has multiple worktime entries on the same day
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$worktime.startTime' } },
            taskId: '$_id',
          },
          estimatedTimeMins: { $first: { $ifNull: ['$estimatedTime', 0] } },
          worktimeMs: {
            $sum: {
              $subtract: [
                { $ifNull: ['$worktime.endTime', '$$NOW'] },
                '$worktime.startTime',
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          worktimeMs:        { $sum: '$worktimeMs' },
          estimatedTimeMins: { $sum: '$estimatedTimeMins' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const items = results.map((r) => ({
      date:              r._id,
      workTimeHour:      Math.round((r.worktimeMs / 3_600_000) * 100) / 100,
      estimatedTimeHour: Math.round((r.estimatedTimeMins / 60) * 100) / 100,
    }));

    return {
      success: true,
      message: 'Worktime overview fetched successfully',
      data: { items },
    };
  }

  async getCurrentUserActiveTicket(userId: string) {
    const [result] = await this.taskModel.aggregate([
      {
        $match: {
          assignee: new Types.ObjectId(userId),
          status: 'In Progress',
          isDeleted: false,
        },
      },
      { $limit: 1 },
      {
        $lookup: {
          from: 'tickets',
          localField: 'ticketId',
          foreignField: '_id',
          as: 'ticket',
          pipeline: [
            {
              $lookup: {
                from: 'projects',
                localField: 'projects',
                foreignField: '_id',
                as: 'projectDocs',
                pipeline: [{ $project: { _id: 1, title: 1 } }],
              },
            },
            { $project: { _id: 1, ticketNumber: 1, title: 1, status: 1, projectDocs: 1 } },
          ],
        },
      },
      { $unwind: { path: '$ticket', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: '$ticket._id',
          ticketNumber: '$ticket.ticketNumber',
          title: '$ticket.title',
          status: '$ticket.status',
          project: {
            $map: {
              input: { $ifNull: ['$ticket.projectDocs', []] },
              as: 'p',
              in: { id: '$$p._id', name: '$$p.title' },
            },
          },
        },
      },
    ]);

    return {
      success: true,
      message: 'Active ticket fetched successfully',
      data: result ?? null,
    };
  }

  async getCurrentUserActiveTask(userId: string) {
    const task = await this.taskModel
      .findOne({ assignee: new Types.ObjectId(userId), status: 'In Progress', isDeleted: false })
      .populate('assignee', 'name photo')
      .populate('createdBy', 'name photo')
      .populate('ticketId', 'ticketNumber priority')
      .lean()
      .exec();

    if (!task) {
      return { success: true, message: 'Active task fetched successfully', data: null };
    }

    const { ticketId, ...rest } = task as any;
    return {
      success: true,
      message: 'Active task fetched successfully',
      data: { ...rest, ticket: ticketId ?? null },
    };
  }
}
