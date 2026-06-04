import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from 'src/modules/task/entities/task.schema';
import { Ticket, TicketDocument } from 'src/modules/ticket/entities/ticket.schema';
import { MyPriorityQueryDto } from '../dto/my-priority.dto';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';

@Injectable()
export class MyPriorityService {
    private readonly logger = new Logger(MyPriorityService.name);

    constructor(
        @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
        // @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    ) { }

    async getMyPriorityTasks(currentUser: AuthenticatedUser, query: MyPriorityQueryDto) {
        this.logger.debug(
            `Fetching priority tasks for user ${currentUser} with query: ${JSON.stringify(query)}`,
        );

        const page = query.page ?? 1;
        const length = query.length ?? 10;
        const skip = (page - 1) * length;

        const match: Record<string, any> = {
            assignee: new Types.ObjectId(currentUser.userId),
            isDeleted: { $ne: true },
            status: { $ne: 'Completed' },
        };

        if (query.projectId) {
            match.projectId = new Types.ObjectId(query.projectId);
        }
        if (query.taskId) match._id = new Types.ObjectId(query.taskId);
        if (query.search) match.title = { $regex: query.search, $options: 'i' };

        const [result] = await this.taskModel.aggregate([
            { $match: match },

            // ── 2. Join ticket → derive priority ─────────────────────────────
            {
                $lookup: {
                    from: 'tickets',
                    localField: 'ticketId',
                    foreignField: '_id',
                    pipeline: [{ $project: { priority: 1, ticketNumber: 1, title: 1 } }],
                    as: '_ticket',
                },
            },

            {
                $addFields: {
                    priority: { $arrayElemAt: ['$_ticket.priority', 0] },
                    ticket: { $arrayElemAt: ['$_ticket', 0] },
                },
            },

            // ── 3. Compute due-date bucket ────────────────────────────────────
            //   0 = overdue, 1 = today, 2 = tomorrow, 3+ = future (sequential)
            //   9999 = no dueDate (goes to bottom)

            {
                $addFields: {
                    sortByDate: {
                        $cond: {
                            if: { $not: ['$dueDate'] },
                            then: 9999,
                            else: {
                                $let: {
                                    vars: {
                                        // diff in whole days between due-day and today (UTC midnight)
                                        diffDays: {
                                            $divide: [
                                                {
                                                    $subtract: [
                                                        {
                                                            $dateFromParts: {
                                                                year: { $year: '$dueDate' },
                                                                month: { $month: '$dueDate' },
                                                                day: { $dayOfMonth: '$dueDate' },
                                                            },
                                                        },
                                                        {
                                                            $dateFromParts: {
                                                                year: { $year: '$$NOW' },
                                                                month: { $month: '$$NOW' },
                                                                day: { $dayOfMonth: '$$NOW' },
                                                            },
                                                        },
                                                    ],
                                                },
                                                86_400_000, // ms per day
                                            ],
                                        },
                                    },
                                    in: {
                                        $switch: {
                                            branches: [
                                                { case: { $lt: ['$$diffDays', 0] }, then: 0 }, // overdue
                                                { case: { $eq: ['$$diffDays', 0] }, then: 1 }, // today
                                                { case: { $eq: ['$$diffDays', 1] }, then: 2 }, // tomorrow
                                            ],
                                            default: { $add: [2, '$$diffDays'] }, // future sequential
                                        },
                                    },
                                },
                            },
                        },
                    },

                    // ── 4. Priority rank (lower = more urgent) ──────────────────
                    sortByPriority: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$priority', 'Emergency'] }, then: 0 },
                                { case: { $eq: ['$priority', 'High'] }, then: 1 },
                                { case: { $eq: ['$priority', 'Medium'] }, then: 2 },
                                { case: { $eq: ['$priority', 'Low'] }, then: 3 },
                            ],
                            default: 4,
                        },
                    },
                },
            },

            // ── 5. Sort: due-date bucket first, then priority ─────────────────
            { $sort: { sortByDate: 1, sortByPriority: 1, createdAt: 1 } },

            // ── 6. Facet: paginated data + total count in one round-trip ──────
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: length },
                        {
                            $project: {
                                _id: 1,
                                taskNumber: 1,
                                title: 1,
                                description: 1,
                                status: 1,
                                dueDate: 1,
                                estimatedTime: 1,
                                worktime: 1,
                                priority: 1,
                                ticket: 1,
                                assignee: 1,
                                projectId: 1,
                                createdAt: 1,
                            },
                        },
                    ],
                    totalCount: [{ $count: 'count' }],
                },
            },
        ]);

        const total = result.totalCount[0]?.count ?? 0;

        return {
            success: true,
            message: 'My priority tasks fetched successfully',
            data: result.data,
            pagination: {
                total,
                page,
                length,
                totalPages: Math.ceil(total / length),
            },
        };
    }
}
