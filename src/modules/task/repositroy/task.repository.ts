import { InjectModel } from "@nestjs/mongoose";
import { BaseRepository } from "src/common/repositories/base.repository";
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { Task, TaskDocument } from "../entities/task.schema";

@Injectable()
export class TaskRepository extends BaseRepository<TaskDocument> {
  constructor(@InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>) {
    super(taskModel);
  }

  async getAnomalyTasksAgg(start: Date, end: Date, skip: number, limit: number): Promise<any[]> {
    return this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: 'tickets',
          localField: 'ticketId',
          foreignField: '_id',
          as: 'ticket',
          pipeline: [{ $project: { _id: 1, ticketNumber: 1, title: 1, priority: 1, dueDate: 1 } }],
        },
      },
      { $unwind: { path: '$ticket', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          $or: [
            { 'ticket.dueDate': { $gt: end },                       status: 'Completed'          },
            { 'ticket.dueDate': { $gte: start, $lte: end },         status: { $ne: 'Completed' } },
          ],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignee',
          foreignField: '_id',
          as: 'assigneeDoc',
          pipeline: [{ $project: { _id: 1, name: 1, photo: 1 } }],
        },
      },
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
                id:         '$_id',
                taskNumber: 1,
                title:      1,
                status:     1,
                dueDate:    1,
                assignee: { $arrayElemAt: ['$assigneeDoc', 0] },
                ticket: {
                  id:           '$ticket._id',
                  ticketNumber: '$ticket.ticketNumber',
                  title:        '$ticket.title',
                  priority:     '$ticket.priority',
                  dueDate:      '$ticket.dueDate',
                },
              },
            },
          ],
        },
      },
    ]);
  }
}