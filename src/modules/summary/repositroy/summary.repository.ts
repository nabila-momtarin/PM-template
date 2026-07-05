import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from 'src/modules/task/entities/task.schema';
import { Ticket, TicketDocument } from 'src/modules/ticket/entities/ticket.schema';
import { User, UserDocument } from 'src/modules/user/entities/user.schema';

@Injectable()
export class SummaryRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
  ) {}
  private readonly logger = new Logger(SummaryRepository.name);

  async getUserSummaryAgg(
    userFilterMatch: Record<string, any> | null,
    taskFilterMatch: Record<string, any> | null,
    now: Date,
    start?: Date,
    end?: Date,
  ): Promise<any[]> {
    const worktimeDateFilter =
      start && end
        ? [
            { $gte: ['$tasks.worktime.startTime', start] },
            { $lte: ['$tasks.worktime.startTime', end] },
          ]
        : [];

    return this.userModel.aggregate([
      {
        $match: {
          $and: [{ isDeleted: false }, ...(userFilterMatch ? [userFilterMatch] : [])],
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
                  {
                    $expr: {
                      $and: [{ $eq: ['$assignee', '$$userId'] }, { $eq: ['$isDeleted', false] }],
                    },
                  },
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
          userName: { $first: '$name' },
          userPhoto: { $first: '$photo' },
          userCreatedAt: { $first: '$createdAt' },
          estimatedTime: { $first: '$tasks.estimatedTime' },
          taskStatus: { $first: '$tasks.status' },
          taskTitle: { $first: '$tasks.title' },
          taskDueDate: { $first: '$tasks.dueDate' },
          taskTicketId: { $first: '$tasks.ticketId' },
          worktimeMs: {
            $sum: {
              $cond: {
                if: {
                  $and: [{ $ifNull: ['$tasks.worktime.startTime', false] }, ...worktimeDateFilter],
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
          name: { $first: '$userName' },
          photo: { $first: '$userPhoto' },
          createdAt: { $first: '$userCreatedAt' },
          totalEstimatedMins: { $sum: { $ifNull: ['$estimatedTime', 0] } },
          totalWorktimeMs: { $sum: '$worktimeMs' },
          totalTaskCount: { $sum: { $cond: [{ $ifNull: ['$_id.taskId', false] }, 1, 0] } },
          completedTaskCount: {
            $sum: { $cond: [{ $eq: ['$taskStatus', 'Completed'] }, 1, 0] },
          },
          overDueTaskCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ['$taskDueDate', false] },
                    { $lt: ['$taskDueDate', now] },
                    { $ne: ['$taskStatus', 'Completed'] },
                  ],
                },
                1,
                0,
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
                $expr: { $and: [{ $eq: ['$_id', '$$ticketId'] }, { $eq: ['$isDeleted', false] }] },
              },
            },
            { $project: { _id: 1, ticketNumber: 1, title: 1, priority: 1, dueDate: 1, status: 1, ticketType: 1 } },
          ],
          as: 'ticketData',
        },
      },
      {$sort: { createdAt: -1 }},
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: 1,
          photo: 1,
          totalTaskCount: 1,
          completedTaskCount: 1,
          overDueTaskCount: 1,
          runningTask: {
            $cond: {
              if: { $ifNull: ['$runningTask.id', false] },
              then: { id: '$runningTask.id', name: '$runningTask.name' },
              else: null,
            },
          },
          estimatedTime: '$totalEstimatedMins',
          workTime: '$totalWorktimeMs',
          ticket: {
            $let: {
              vars: { t: { $arrayElemAt: ['$ticketData', 0] } },
              in: {
                $cond: {
                  if: { $ifNull: ['$$t', false] },
                  then: {
                    id: '$$t._id',
                    ticketNumber: '$$t.ticketNumber',
                    title: '$$t.title',
                    priority: '$$t.priority',
                    dueDate: '$$t.dueDate',
                    ticketType: '$$t.ticketType',
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
    assigneeId?: string,
  ): Promise<any[]> {
    const assigneeOid = assigneeId ? new Types.ObjectId(assigneeId) : null;

    const taskLookupPipeline: any[] = [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$ticketId', '$$ticketId'] },
              { $eq: ['$isDeleted', false] },
              ...(assigneeOid ? [{ $eq: ['$assignee', assigneeOid] }] : []),
            ],
          },
        },
      },
      { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$_id',
          estimatedTime: { $first: '$estimatedTime' },
          worktimeMs: {
            $sum: {
              $subtract: [{ $ifNull: ['$worktime.endTime', '$$NOW'] }, '$worktime.startTime'],
            },
          },
        },
      },
    ];

    const pipeline: any[] = [
      {
        $match: {
          $and: [
            { isDeleted: false },
            ...(start && end ? [{ dueDate: { $gte: start, $lte: end } }] : []),
            ...(filterMatch ? [filterMatch] : []),
          ],
        },
      },
    ];

    if (assigneeOid) {
      pipeline.push(
        {
          $lookup: {
            from: 'tasks',
            let: { ticketId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$ticketId', '$$ticketId'] },
                      { $eq: ['$isDeleted', false] },
                      { $eq: ['$assignee', assigneeOid] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: '_assigneeCheck',
          },
        },
        { $match: { '_assigneeCheck.0': { $exists: true } } },
      );
    }

    pipeline.push({
      $facet: {
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byType: [{ $group: { _id: '$ticketType', count: { $sum: 1 } } }],
        total: [{ $count: 'count' }],
        overdue: [
          { $match: { dueDate: { $lt: now }, status: { $ne: 'Closed' } } },
          { $count: 'count' },
        ],
        timeTotals: [
          {
            $lookup: {
              from: 'tasks',
              let: { ticketId: '$_id' },
              pipeline: taskLookupPipeline,
              as: 'taskData',
            },
          },
          { $unwind: { path: '$taskData', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              totalEstimatedMins: { $sum: { $ifNull: ['$taskData.estimatedTime', 0] } },
              totalWorktimeMs: { $sum: { $ifNull: ['$taskData.worktimeMs', 0] } },
            },
          },
        ],
      },
    });

    return this.ticketModel.aggregate(pipeline);
  }

  async getExtraTimeTotalsAgg(
    filterMatch: Record<string, any> | null,
    start: Date,
    end: Date,
    assigneeId?: string,
  ): Promise<any> {
    const assigneeOid = assigneeId ? new Types.ObjectId(assigneeId) : null;

    const taskLookupPipeline: any[] = [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$ticketId', '$$ticketId'] },
              { $eq: ['$isDeleted', false] },
              ...(assigneeOid ? [{ $eq: ['$assignee', assigneeOid] }] : []),
            ],
          },
        },
      },
      { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$_id',
          estimatedTime: { $first: '$estimatedTime' },
          worktimeMs: {
            $sum: {
              $subtract: [{ $ifNull: ['$worktime.endTime', '$$NOW'] }, '$worktime.startTime'],
            },
          },
        },
      },
    ];

    const pipeline: any[] = [
      {
        $match: {
          $and: [
            { isDeleted: false },
            { $or: [{ dueDate: { $lt: start } }, { dueDate: { $gt: end } }] },
            ...(filterMatch ? [filterMatch] : []),
          ],
        },
      },
    ];

    if (assigneeOid) {
      pipeline.push(
        {
          $lookup: {
            from: 'tasks',
            let: { ticketId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$ticketId', '$$ticketId'] },
                      { $eq: ['$isDeleted', false] },
                      { $eq: ['$assignee', assigneeOid] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: '_assigneeCheck',
          },
        },
        { $match: { '_assigneeCheck.0': { $exists: true } } },
      );
    }

    pipeline.push(
      {
        $lookup: {
          from: 'tasks',
          let: { ticketId: '$_id' },
          pipeline: taskLookupPipeline,
          as: 'taskData',
        },
      },
      { $unwind: { path: '$taskData', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalExtraEstimatedMins: { $sum: { $ifNull: ['$taskData.estimatedTime', 0] } },
          totalExtraWorktimeMs: { $sum: { $ifNull: ['$taskData.worktimeMs', 0] } },
        },
      },
    );

    const [result] = await this.ticketModel.aggregate(pipeline);
    return result ?? { totalExtraEstimatedMins: 0, totalExtraWorktimeMs: 0 };
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
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          overdue: [
            { $match: { dueDate: { $lt: now }, status: { $ne: 'Completed' } } },
            { $count: 'count' },
          ],
        },
      },
    ]);
  }

  async getAnomalyTaskCount(start: Date, end: Date): Promise<number> {
    const [result] = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: 'tickets',
          localField: 'ticketId',
          foreignField: '_id',
          as: 'ticket',
          pipeline: [{ $project: { _id: 0, dueDate: 1 } }],
        },
      },
      { $unwind: { path: '$ticket', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          $or: [
            // Case 1: ticket dueDate after range, but task is completed
            { 'ticket.dueDate': { $gt: end }, status: 'Completed' },
            // Case 2: ticket dueDate within range, but task is not completed
            { 'ticket.dueDate': { $gte: start, $lte: end }, status: { $ne: 'Completed' } },
          ],
        },
      },
      { $count: 'count' },
    ]);
    return result?.count ?? 0;
  }

  async getUserById(userId: string): Promise<any | null> {
    return this.userModel
      .findById(userId)
      .select({ _id: 1, name: 1, photo: 1, email: 1 })
      .lean()
      .exec();
  }

  async getUserWorktimeInRangeAgg(start: Date, end: Date, sort?: string): Promise<any[]> {
    return this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: false } },
      { $match: { 'worktime.startTime': { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { userId: '$assignee', taskId: '$_id' },
          worktimeMs: {
            $sum: {
              $subtract: [{ $ifNull: ['$worktime.endTime', '$$NOW'] }, '$worktime.startTime'],
            },
          },
        },
      },
      {
        $group: {
          _id: '$_id.userId',
          totalWorktimeMs: { $sum: '$worktimeMs' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { _id: 1, name: 1, email: 1, photo: 1, createdAt: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          _id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          photo: '$user.photo',
          createdAt: '$user.createdAt',
          totalWorktimeMs: 1,
        },
      },
      { $sort: { [sort || 'createdAt']: -1 } },
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
                then: {
                  $subtract: [{ $ifNull: ['$worktime.endTime', '$$NOW'] }, '$worktime.startTime'],
                },
                else: 0,
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$_id.ticketId',
          worktimeMs: { $sum: '$worktimeMs' },
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
          total: [{ $count: 'count' }],
          byPriority: [{ $group: { _id: '$ticketPriority', count: { $sum: 1 } } }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
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
            date: { $dateToString: { format: '%Y-%m-%d', date: '$worktime.startTime' } },
            taskId: '$_id',
          },
          estimatedTimeMins: { $first: { $ifNull: ['$estimatedTime', 0] } },
          worktimeMs: {
            $sum: {
              $subtract: [{ $ifNull: ['$worktime.endTime', '$$NOW'] }, '$worktime.startTime'],
            },
          },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          worktimeMs: { $sum: '$worktimeMs' },
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
            date: { $dateToString: { format: '%Y-%m-%d', date: '$worktime.startTime' } },
            taskId: '$_id',
          },
          estimatedTimeMins: { $first: { $ifNull: ['$estimatedTime', 0] } },
          worktimeMs: {
            $sum: {
              $subtract: [{ $ifNull: ['$worktime.endTime', '$$NOW'] }, '$worktime.startTime'],
            },
          },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          worktimeMs: { $sum: '$worktimeMs' },
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

  // ── Task collection-এর উপর single pass, $facet দিয়ে সব metric একসাথে বের করা ──

  // async getDashboardTaskFacet(
  //   match: Record<string, any>,
  //   now: Date,
  //   hasFullRange: boolean,
  //   startDate?: Date,
  //   endDate?: Date,
  // ) {
  //   return this.taskModel.aggregate([
  //     // raw schema field-এ filter সবার আগে — lookup/transform-এর পরে দিলে silently broken হয় (আগের audit learning)
  //     { $match: match },

  //     // শুধু দরকারি field রাখা — facet branch-গুলোর per-doc memory load কমানোর জন্য
  //     // ticketObjectId: কিছু পুরনো task-এ ticketId string হিসেবে stored (ObjectId না), তাই এখানেই একবার cast করে নেওয়া হচ্ছে —
  //     // byPriority আর ticketIds দুই branch-ই এটা reuse করবে, duplicate $convert লাগবে না
  //     {
  //       $project: {
  //         status: 1,
  //         dueDate: 1,
  //         estimatedTime: 1,
  //         worktime: 1,
  //         assignee: 1,
  //         ticketId: 1,
  //         taskNumber: 1,
  //         title: 1,
  //         ticketObjectId: {
  //           $convert: { input: '$ticketId', to: 'objectId', onError: null, onNull: null },
  //         },
  //       },
  //     },

  //     {
  //       $facet: {
  //         // ── মোট task count ──
  //         total: [{ $count: 'count' }],

  //         // ── status-wise group (toDo/inProgress/completed) ──
  //         byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],

  //         // ── dueDate পার হয়ে গেছে, এখনো Completed হয়নি ──
  //         overdue: [
  //           { $match: { dueDate: { $lt: now }, status: { $ne: 'Completed' } } },
  //           { $count: 'count' },
  //         ],

  //         // ── ticket join করে priority আনা (priority Task-এ stored না, Ticket থেকে derive হয়) ──
  //         byPriority: [
  //           {
  //             $lookup: {
  //               from: 'tickets',
  //               localField: 'ticketObjectId',
  //               foreignField: '_id',
  //               as: 'ticket',
  //             },
  //           },
  //           { $unwind: { path: '$ticket', preserveNullAndEmptyArrays: true } },
  //           { $group: { _id: '$ticket.priority', count: { $sum: 1 } } },
  //         ],

  //         // ── estimatedTime + worktime session sum (workload card-এর জন্য) ──
  //         workload: [
  //           {
  //             $project: {
  //               estimatedTime: 1,
  //               worktimeMs: {
  //                 $sum: {
  //                   $map: {
  //                     input: { $ifNull: ['$worktime', []] },
  //                     as: 'w',
  //                     // endTime null হলে এখনো চলছে — $$NOW দিয়ে live session-ও ধরা হচ্ছে
  //                     in: { $subtract: [{ $ifNull: ['$$w.endTime', '$$NOW'] }, '$$w.startTime'] },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //           {
  //             $group: {
  //               _id: null,
  //               totalEstimatedMins: { $sum: '$estimatedTime' },
  //               totalWorktimeMs: { $sum: '$worktimeMs' },
  //             },
  //           },
  //         ],

  //         // ── worktime unwind করে date-wise group, প্রতিদিনের worktime/estimated sum ──
  //         // রেঞ্জ দেওয়া না-দেওয়া নির্বিশেষে এটা সবসময় চলে (requirement অনুযায়ী)
  //         taskHistory: [
  //           { $unwind: '$worktime' },
  //           {
  //             $group: {
  //               _id: { $dateToString: { format: '%Y-%m-%d', date: '$worktime.startTime' } },
  //               totalWorkTimeMs: {
  //                 $sum: {
  //                   $subtract: [{ $ifNull: ['$worktime.endTime', '$$NOW'] }, '$worktime.startTime'],
  //                 },
  //               },
  //               totalEstimatedMins: { $sum: '$estimatedTime' },
  //             },
  //           },
  //           { $sort: { _id: 1 } },
  //         ],

  //         // ── assignee-wise estimatedTime sum (overloaded/available বের করতে দরকার) — শুধু range থাকলে চলে ──
  //         userWorkload: hasFullRange
  //           ? [{ $group: { _id: '$assignee', totalEstimatedMins: { $sum: '$estimatedTime' } } }]
  //           : [],

  //         // ── matched task-গুলোর parent ticketId সব বের করা — Ticket section কে এই দিয়েই scope করা হবে ──
  //         // কারণ Ticket schema-তে dueDate নাই, তাই date-filter শুধু Task-এর মধ্য দিয়েই Ticket-এ পৌঁছাতে পারে
  //         ticketIds: [{ $group: { _id: null, ids: { $addToSet: '$ticketObjectId' } } }],

  //         // ── ANOMALY TASK: dueDate range-এর পরে, কিন্তু কাজ (worktime session) range-এর ভিতরে শুরু/চলেছে ──
  //         // FIXED: nested $facet বাদ, $group+$push+$slice দিয়ে count+list একসাথে এক pass-এ
  //         anomalyTask: hasFullRange
  //           ? [
  //               { $match: { dueDate: { $gt: endDate } } },
  //               {
  //                 $match: {
  //                   worktime: { $elemMatch: { startTime: { $gte: startDate, $lte: endDate } } },
  //                 },
  //               },
  //               {
  //                 $group: {
  //                   _id: null,
  //                   totalCount: { $sum: 1 },
  //                   list: {
  //                     $push: {
  //                       _id: '$_id',
  //                       taskNumber: '$taskNumber',
  //                       title: '$title',
  //                       dueDate: '$dueDate',
  //                     },
  //                   },
  //                 },
  //               },
  //               { $project: { totalCount: 1, list: 1/* { $slice: ['$list', 50] } */ } }, // payload bloat ঠেকাতে limit
  //             ]
  //           : [],

  //         // ── IGNORED TASK: dueDate range-এর ভিতরে, কিন্তু কোনো worktime session-ই নাই (শুরুই হয়নি) ──
  //         // FIXED: একই pattern, nested $facet ছাড়া
  //         ignoredTask: hasFullRange
  //           ? [
  //               {
  //                 $match: {
  //                   dueDate: { $gte: startDate, $lte: endDate },
  //                   $or: [{ worktime: { $exists: false } }, { worktime: { $size: 0 } }],
  //                 },
  //               },
  //               {
  //                 $group: {
  //                   _id: null,
  //                   totalCount: { $sum: 1 },
  //                   list: {
  //                     $push: {
  //                       _id: '$_id',
  //                       taskNumber: '$taskNumber',
  //                       title: '$title',
  //                       dueDate: '$dueDate',
  //                     },
  //                   },
  //                 },
  //               },
  //               { $project: { totalCount: 1, list: 1 /* { $slice: ['$list', 50] } */ } }, // payload bloat ঠেকাতে limit
  //             ]
  //           : [],
  //       },
  //     },
  //   ]);
  // }

  // // ── Ticket collection-এর উপর single pass, total/priority/status/type count ──
  // async getDashboardTicketFacet(match: Record<string, any>) {
  //   return this.ticketModel.aggregate([
  //     { $match: match },
  //     {
  //       $facet: {
  //         total: [{ $count: 'count' }],
  //         byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
  //         byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
  //         byType: [{ $group: { _id: '$ticketType', count: { $sum: 1 } } }],
  //       },
  //     },
  //   ]);
  // }

  // // ── overloaded/available user-দের জন্য হালকা _id-based lookup, শুধু name/email/photo ──
  // // (heavy facet pipeline-এর ভিতরে এই join না দিয়ে আলাদা ছোট query রাখা হয়েছে — lighter, debug সহজ)
  // async getUsersByIds(ids: Types.ObjectId[]) {
  //   return this.userModel
  //     .find({ _id: { $in: ids }, isDeleted: false }, { name: 1, email: 1, photo: 1 })
  //     .lean();
  // }

  async getDashboardTaskFacet(
  match: Record<string, any>,
  now: Date,
  hasFullRange: boolean,
  rangeStart?: Date,
  rangeEnd?: Date,
) {
  return this.taskModel.aggregate([
    // raw field-এ filter সবার আগে — lookup/transform-এর পরে দিলে silently broken হয় (audit learning)
    { $match: match },
 
    // দরকারি field রাখা + ticketId কে ObjectId-এ cast (একবারেই, সব branch reuse করবে)
    // কিছু পুরনো task-এ ticketId string হিসেবে stored — $convert দিয়ে নিরাপদে handle
    {
      $project: {
        status: 1,
        dueDate: 1,
        estimatedTime: 1,
        worktime: 1,
        assignee: 1,
        ticketId: 1,
        taskNumber: 1,
        title: 1,
        ticketObjectId: {
          $convert: { input: '$ticketId', to: 'objectId', onError: null, onNull: null },
        },
      },
    },
 
    {
      $facet: {
        // ── মোট task count ──
        total: [{ $count: 'count' }],
 
        // ── status-wise group ──
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
 
        // ── dueDate পার, এখনো Completed না ──
        overdue: [
          { $match: { dueDate: { $lt: now }, status: { $ne: 'Completed' } } },
          { $count: 'count' },
        ],
 
        // ── ticket join করে priority (priority Task-এ নাই, Ticket থেকে derive) ──
        byPriority: [
          { $lookup: { from: 'tickets', localField: 'ticketObjectId', foreignField: '_id', as: 'ticket' } },
          { $unwind: { path: '$ticket', preserveNullAndEmptyArrays: true } },
          { $group: { _id: '$ticket.priority', count: { $sum: 1 } } },
        ],
 
        // ── estimatedTime + worktime sum (workload card) ──
        workload: [
          {
            $project: {
              estimatedTime: 1,
              worktimeMs: {
                $sum: {
                  $map: {
                    input: { $ifNull: ['$worktime', []] },
                    as: 'w',
                    // endTime null = এখনো চলছে, $$NOW দিয়ে live session-ও count
                    in: { $subtract: [{ $ifNull: ['$$w.endTime', '$$NOW'] }, '$$w.startTime'] },
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: null,
              totalEstimatedMins: { $sum: '$estimatedTime' },
              totalWorktimeMs: { $sum: '$worktimeMs' },
            },
          },
        ],
 
        // ── date-wise worktime group (range দেওয়া না-দেওয়া নির্বিশেষে সবসময় চলে) ──
        taskHistory: [
          { $unwind: '$worktime' },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$worktime.startTime' } },
              totalWorkTimeMs: {
                $sum: { $subtract: [{ $ifNull: ['$worktime.endTime', '$$NOW'] }, '$worktime.startTime'] },
              },
              totalEstimatedMins: { $sum: '$estimatedTime' },
            },
          },
          { $sort: { _id: 1 } },
        ],
 
        // ── assignee-wise estimatedTime sum (overloaded/available-এর জন্য) — শুধু range থাকলে ──
        userWorkload: hasFullRange
          ? [{ $group: { _id: '$assignee', totalEstimatedMins: { $sum: '$estimatedTime' } } }]
          : [],
 
        // ── matched task-গুলোর parent ticketId — Ticket facet এই দিয়েই scope হবে ──
        ticketIds: [{ $group: { _id: null, ids: { $addToSet: '$ticketObjectId' } } }],
 
        // ── anomalyTicket-এর candidate ticketId ──
        // condition: worktime session আছে (started, complete হোক বা না হোক)
        //            AND সেই session range-এর ভিতরে
        // Ticket facet এই ids নিয়ে verify করবে ticket dueDate range-এর পরে কিনা
        anomalyTaskTicketIds: hasFullRange
          ? [
              {
                $match: {
                  worktime: { $elemMatch: { startTime: { $gte: rangeStart, $lte: rangeEnd } } },
                },
              },
              { $group: { _id: null, ids: { $addToSet: '$ticketObjectId' } } },
            ]
          : [],
 
        // ── [COMMENTED OUT] পুরনো anomalyTask (task-based ছিল, ticket-based-এ migrate হয়েছে) ──
        // anomalyTask: hasFullRange
        //   ? [
        //       { $match: { dueDate: { $gt: rangeEnd } } },
        //       { $match: { worktime: { $elemMatch: { startTime: { $gte: rangeStart, $lte: rangeEnd } } } } },
        //       {
        //         $group: {
        //           _id: null,
        //           totalCount: { $sum: 1 },
        //           list: { $push: { _id: '$_id', taskNumber: '$taskNumber', title: '$title', dueDate: '$dueDate' } },
        //         },
        //       },
        //       { $project: { totalCount: 1, list: 1 } },
        //     ]
        //   : [],
 
        // ── [COMMENTED OUT] পুরনো ignoredTask (task-based ছিল, ticket-based-এ migrate হয়েছে) ──
        // ignoredTask: hasFullRange
        //   ? [
        //       {
        //         $match: {
        //           dueDate: { $gte: rangeStart, $lte: rangeEnd },
        //           $or: [{ worktime: { $exists: false } }, { worktime: { $size: 0 } }],
        //         },
        //       },
        //       {
        //         $group: {
        //           _id: null,
        //           totalCount: { $sum: 1 },
        //           list: { $push: { _id: '$_id', taskNumber: '$taskNumber', title: '$title', dueDate: '$dueDate' } },
        //         },
        //       },
        //       { $project: { totalCount: 1, list: 1 } },
        //     ]
        //   : [],
      },
    },
  ]);
}
 
// ════════════════════════════════════════════════════════
// Call 2: Ticket collection — single pass, $facet দিয়ে ticket metric + anomalyTicket
// ════════════════════════════════════════════════════════
async getDashboardTicketFacet(
  match: Record<string, any>,
  anomalyTicketIds: Types.ObjectId[],
  hasFullRange: boolean,
  rangeEnd?: Date,
) {
  return this.ticketModel.aggregate([
    { $match: match },
    {
      $facet: {
        // ── মোট ticket count ──
        total: [{ $count: 'count' }],
 
        // ── priority / status / type group ──
        byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byType: [{ $group: { _id: '$ticketType', count: { $sum: 1 } } }],
 
        // ── ANOMALY TICKET ──
        // condition: ticket dueDate range-এর পরে
        //            AND এই ticket-এর under-এ কোনো task range-এর ভিতরে worktime করেছে
        // (anomalyTicketIds = Task facet থেকে আসা candidate ids)
        anomalyTicket: hasFullRange && anomalyTicketIds.length
          ? [
              {
                $match: {
                  _id: { $in: anomalyTicketIds },
                  dueDate: { $gt: rangeEnd },
                },
              },
              {
                $group: {
                  _id: null,
                  totalCount: { $sum: 1 },
                  list: { $push: { _id: '$_id', ticketNumber: '$ticketNumber', title: '$title', dueDate: '$dueDate' } },
                },
              },
            ]
          : [],
      },
    },
  ]);
}
 
// ════════════════════════════════════════════════════════
// Call 3: ignoredTicket — আলাদা method রাখতে হচ্ছে কারণ $match আলাদা
// getDashboardTicketFacet শুরু হয় matchedTicketIds দিয়ে (task-derived scope)
// কিন্তু ignoredTicket দরকার dueDate range-এর সব ticket — $facet-এর branch হিসেবে রাখা যাবে না
// (একই $facet-এর সব branch একই initial $match share করে — MongoDB-র constraint)
// ════════════════════════════════════════════════════════
async getIgnoredTickets(rangeStart: Date, rangeEnd: Date) {
  return this.ticketModel.aggregate([
    // dueDate range-এর ভিতরে সব non-deleted ticket
    { $match: { isDeleted: false, dueDate: { $gte: rangeStart, $lte: rangeEnd } } },
 
    // Task collection-এ join — filter ছাড়া, শুধু ticketId existence check
    // $limit: 1 দিয়ে early exit — task আছে কিনা জানলেই হবে, সব task লাগবে না
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'ticketId',
        pipeline: [
          { $match: { isDeleted: false } },
          { $limit: 1 },
        ],
        as: 'tasks',
      },
    },
 
    // task array empty = কোনো task create হয়নি = ignoredTicket
    { $match: { tasks: { $size: 0 } } },
 
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        list: { $push: { _id: '$_id', ticketNumber: '$ticketNumber', title: '$title', dueDate: '$dueDate' } },
      },
    },
  ]);
}
 
// ════════════════════════════════════════════════════════
// Call 4 (conditional): overloaded/available user-দের name/email/photo আনা
// facet-এর ভিতরে $lookup না দিয়ে আলাদা রাখা — lighter, debug সহজ
// ════════════════════════════════════════════════════════
async getUsersByIds(ids: Types.ObjectId[]) {
  return this.userModel
    .find({ _id: { $in: ids }, isDeleted: false }, { name: 1, email: 1, photo: 1 })
    .lean();
}
}
