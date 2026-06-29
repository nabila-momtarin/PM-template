import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from 'src/modules/task/entities/task.schema';
import { Ticket, TicketDocument } from 'src/modules/ticket/entities/ticket.schema';
import { User, UserDocument } from 'src/modules/user/entities/user.schema';

@Injectable()
export class SummaryRepository {
  constructor(
    @InjectModel(User.name)   private readonly userModel: Model<UserDocument>,
    @InjectModel(Task.name)   private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
  ) {}

  async getUserSummaryAgg(
    userFilterMatch: Record<string, any> | null,
    taskFilterMatch: Record<string, any> | null,
    now: Date,
    start?: Date,
    end?: Date,
  ): Promise<any[]> {
    const worktimeDateFilter = start && end
      ? [{ $gte: ['$tasks.worktime.startTime', start] }, { $lte: ['$tasks.worktime.startTime', end] }]
      : [];

    return this.userModel.aggregate([
      {
        $match: {
          $and: [
            { isDeleted: false },
            ...(userFilterMatch ? [userFilterMatch] : []),
          ],
        },
      },
      {
        $lookup: {
          from: 'tasks',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $and: [
                  { $expr: { $and: [
                    { $eq: ['$assignee', '$$userId'] },
                    { $eq: ['$isDeleted', false] },
                  ]}},
                  ...(taskFilterMatch ? [taskFilterMatch] : []),
                ],
              },
            },
          ],
          as: 'tasks',
        },
      },
      { $unwind: { path: '$tasks', preserveNullAndEmptyArrays: !taskFilterMatch } },
      { $unwind: { path: '$tasks.worktime', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { userId: '$_id', taskId: '$tasks._id' },
          userName:      { $first: '$name' },
          userPhoto:     { $first: '$photo' },
          estimatedTime: { $first: '$tasks.estimatedTime' },
          taskStatus:    { $first: '$tasks.status' },
          taskTitle:     { $first: '$tasks.title' },
          taskDueDate:   { $first: '$tasks.dueDate' },
          taskTicketId:  { $first: '$tasks.ticketId' },
          worktimeMs: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $ifNull: ['$tasks.worktime.startTime', false] },
                    ...worktimeDateFilter,
                  ],
                },
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
      {
        $group: {
          _id: '$_id.userId',
          name:               { $first: '$userName' },
          photo:              { $first: '$userPhoto' },
          totalEstimatedMins: { $sum: { $ifNull: ['$estimatedTime', 0] } },
          totalWorktimeMs:    { $sum: '$worktimeMs' },
          totalTaskCount:     { $sum: { $cond: [{ $ifNull: ['$_id.taskId', false] }, 1, 0] } },
          completedTaskCount: {
            $sum: { $cond: [{ $eq: ['$taskStatus', 'Completed'] }, 1, 0] },
          },
          overDueTaskCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $ifNull: ['$taskDueDate', false] },
                  { $lt: ['$taskDueDate', now] },
                  { $ne: ['$taskStatus', 'Completed'] },
                ]},
                1, 0,
              ],
            },
          },
          runningTask: {
            $max: {
              $cond: [
                { $eq: ['$taskStatus', 'In Progress'] },
                { id: '$_id.taskId', name: '$taskTitle', ticketId: '$taskTicketId' },
                null,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'tickets',
          let: { ticketId: '$runningTask.ticketId' },
          pipeline: [
            {
              $match: {
                $expr: { $and: [
                  { $eq: ['$_id', '$$ticketId'] },
                  { $eq: ['$isDeleted', false] },
                ]},
              },
            },
            { $project: { _id: 1, ticketNumber: 1, title: 1, priority: 1, dueDate: 1 } },
          ],
          as: 'ticketData',
        },
      },
      {
        $project: {
          _id: 0,
          userId:             '$_id',
          name:               1,
          photo:              1,
          totalTaskCount:     1,
          completedTaskCount: 1,
          overDueTaskCount:   1,
          runningTask: {
            $cond: {
              if: { $ifNull: ['$runningTask.id', false] },
              then: { id: '$runningTask.id', name: '$runningTask.name' },
              else: null,
            },
          },
          estimatedTime: '$totalEstimatedMins',
          workTime:      '$totalWorktimeMs',
          ticket: {
            $let: {
              vars: { t: { $arrayElemAt: ['$ticketData', 0] } },
              in: {
                $cond: {
                  if: { $ifNull: ['$$t', false] },
                  then: {
                    id:           '$$t._id',
                    ticketNumber: '$$t.ticketNumber',
                    title:        '$$t.title',
                    priority:     '$$t.priority',
                    dueDate:      '$$t.dueDate',
                  },
                  else: null,
                },
              },
            },
          },
        },
      },
    ]);
  }

  async getTicketSummaryAgg(
    filterMatch: Record<string, any> | null,
    now: Date,
    start?: Date,
    end?: Date,
  ): Promise<any[]> {
    const taskLookupPipeline = [
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
    ];

    const facet: Record<string, any> = {
      byPriority: [{ $group: { _id: '$priority',   count: { $sum: 1 } } }],
      byStatus:   [{ $group: { _id: '$status',     count: { $sum: 1 } } }],
      byType:     [{ $group: { _id: '$ticketType', count: { $sum: 1 } } }],
      total:      [{ $count: 'count' }],
      overdue: [
        { $match: { dueDate: { $lt: now }, status: { $ne: 'Closed' } } },
        { $count: 'count' },
      ],
      timeTotals: [
        { $lookup: { from: 'tasks', let: { ticketId: '$_id' }, pipeline: taskLookupPipeline, as: 'taskData' } },
        { $unwind: { path: '$taskData', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalEstimatedMins: { $sum: { $ifNull: ['$taskData.estimatedTime', 0] } },
            totalWorktimeMs:    { $sum: { $ifNull: ['$taskData.worktimeMs', 0] } },
          },
        },
      ],
    };

    if (start && end) {
      facet.extraTimeTotals = [
        { $match: { $or: [{ dueDate: { $lt: start } }, { dueDate: { $gt: end } }] } },
        { $lookup: { from: 'tasks', let: { ticketId: '$_id' }, pipeline: taskLookupPipeline, as: 'taskData' } },
        { $unwind: { path: '$taskData', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalExtraEstimatedMins: { $sum: { $ifNull: ['$taskData.estimatedTime', 0] } },
            totalExtraWorktimeMs:    { $sum: { $ifNull: ['$taskData.worktimeMs', 0] } },
          },
        },
      ];
    }

    return this.ticketModel.aggregate([
      {
        $match: {
          $and: [
            { isDeleted: false },
            ...(filterMatch ? [filterMatch] : []),
          ],
        },
      },
      { $facet: facet },
    ]);
  }

  async getTaskSummaryAgg(
    filterMatch: Record<string, any> | null,
    now: Date,
    start?: Date,
    end?: Date,
  ): Promise<any[]> {
    return this.taskModel.aggregate([
      {
        $match: {
          $and: [
            { isDeleted: false },
            ...(start && end ? [{ dueDate: { $gte: start, $lte: end } }] : []),
            ...(filterMatch ? [filterMatch] : []),
          ],
        },
      },
      {
        $lookup: {
          from: 'tickets',
          localField: 'ticketId',
          foreignField: '_id',
          as: 'ticket',
          pipeline: [{ $project: { _id: 0, priority: 1 } }],
        },
      },
      { $addFields: { ticketPriority: { $arrayElemAt: ['$ticket.priority', 0] } } },
      {
        $facet: {
          byPriority: [{ $group: { _id: '$ticketPriority', count: { $sum: 1 } } }],
          byStatus:   [{ $group: { _id: '$status',         count: { $sum: 1 } } }],
          overdue: [
            { $match: { dueDate: { $lt: now }, status: { $ne: 'Completed' } } },
            { $count: 'count' },
          ],
        },
      },
    ]);
  }

  async getUserTicketSummaryAgg(userId: string): Promise<any[]> {
    return this.taskModel.aggregate([
      {
        $match: {
          assignee: new Types.ObjectId(userId),
          isDeleted: false,
          ticketId: { $exists: true, $ne: null },
        },
      },
      { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: true } },
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
  }

  async getUserTaskSummaryAgg(userId: string, now: Date): Promise<any[]> {
    return this.taskModel.aggregate([
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
      { $addFields: { ticketPriority: { $arrayElemAt: ['$ticket.priority', 0] } } },
      {
        $facet: {
          total:      [{ $count: 'count' }],
          byPriority: [{ $group: { _id: '$ticketPriority', count: { $sum: 1 } } }],
          byStatus:   [{ $group: { _id: '$status',         count: { $sum: 1 } } }],
          overdue: [
            { $match: { dueDate: { $lt: now }, status: { $ne: 'Completed' } } },
            { $count: 'count' },
          ],
        },
      },
    ]);
  }

  async getUserTasksAgg(
    userId: string,
    skip: number,
    limit: number,
    filterMatch: Record<string, any> | null,
  ): Promise<any[]> {
    const conditions: any[] = [{ assignee: new Types.ObjectId(userId), isDeleted: false }];
    if (filterMatch) conditions.push(filterMatch);

    return this.taskModel.aggregate([
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
  }

  async getWorktimeOverviewAgg(start?: Date, end?: Date): Promise<any[]> {
    return this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: false } },
      ...(start && end ? [{ $match: { 'worktime.startTime': { $gte: start, $lte: end } } }] : []),
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
  }

  async getUserWorktimeOverviewAgg(userId: string, start?: Date, end?: Date): Promise<any[]> {
    return this.taskModel.aggregate([
      {
        $match: {
          assignee: new Types.ObjectId(userId),
          isDeleted: false,
        },
      },
      { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: false } },
      ...(start && end ? [{ $match: { 'worktime.startTime': { $gte: start, $lte: end } } }] : []),
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
  }

  async getUserActiveTicketAgg(userId: string): Promise<any | undefined> {
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
    return result;
  }

  async findUserActiveTask(userId: string): Promise<any | null> {
    return this.taskModel
      .findOne({ assignee: new Types.ObjectId(userId), status: 'In Progress', isDeleted: false })
      .populate('assignee', 'name photo')
      .populate('createdBy', 'name photo')
      .populate('ticketId', 'ticketNumber priority')
      .lean()
      .exec();
  }
}
