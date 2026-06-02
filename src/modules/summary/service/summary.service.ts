import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { minsToHHMM, msToHHMM } from 'src/common/utils/time.utils';
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
} 

