import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TicketRepository } from '../repositroy/ticket.repository';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { TicketDocument } from '../entities/ticket.schema';
import { Model, Types } from 'mongoose';
import { TicketQueryDto } from '../dto/ticket-query.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { UpdateTickeDueDatetDto } from '../dto/update-ticket-due-date-.dto';
import { UpdateTicketQaStatusDto } from '../dto/update-ticket-qa-status.dto';

import { mergeAndFilter } from 'src/common/utils/params-decoder';
import { CounterService } from 'src/common/services/counter.service';
import { InjectModel } from '@nestjs/mongoose';
import { Task, TaskDocument } from 'src/modules/task/entities/task.schema';
import { minsToHHMM, msToHHMM } from 'src/common/utils/time.utils';

@Injectable()
export class TicketService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly counterService: CounterService,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  private readonly logger = new Logger(TicketService.name);

  // private async generateTicketNumber(): Promise<string> {
  //   const totalTickets = await this.ticketRepository.countDocuments();

  //   return `TKT-${totalTickets + 1}`;
  // }

  private async generateTicketNumber(): Promise<string> {
    const seq = await this.counterService.generate('ticketCounter');
    return `TKT-${seq}`;
  }

  async createTicket(
    dto: CreateTicketDto,
    files: Express.Multer.File[] = [],
    currentUser: AuthenticatedUser,
  ) {
    this.logger.log('SERVICE: ticket : createTicket');

    try {
      const ticketNumber = await this.generateTicketNumber();
      this.logger.log(`Generated ticket number: ${ticketNumber}`);

      const uploadedAttachments = files.map((file) => `/uploads/tickets/${file.filename}`);

      this.logger.log(uploadedAttachments);

      const ticketPayload: Partial<TicketDocument> = {
        ...dto,
        ticketNumber: ticketNumber,
        attachments: uploadedAttachments,
        createdBy: new Types.ObjectId(currentUser.userId),
        projects: dto.projects?.map((id) => new Types.ObjectId(id)) ?? [],
      };

      const newTicket: any = await this.ticketRepository.createOne(ticketPayload);

      return {
        success: true,
        message: 'Ticket created successfully',
        data: newTicket,
      };
    } catch (err) {
      this.logger.error(
        'TicketService.createTicket failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async getAllTickets(query: TicketQueryDto) {
    this.logger.log('SERVICE: ticket : getAllTickets');

    console.log('Received query:', JSON.stringify(query, null, 2));

    try {
      // let parsedFilter: Record<string, any> = {};

      // try {
      //   if (query.filter && query.filter !== '{}') {
      //     parsedFilter = JSON.parse(query.filter);
      //   }
      // } catch {
      //   parsedFilter = {};
      // }

      // if (query.search) {
      //   parsedFilter.or = [{ title__like: query.search }, { ticketNumber__like: query.search }];
      // }

      const tickets = await this.ticketRepository.getAllData({
        filter: query.filter ?? '{}',
        // filter: baseFilter,
        // filter: JSON.stringify(parsedFilter),
        // filter: JSON.stringify({ and: filterObj }),
        sortStr: query.sort ?? '-createdAt',
        page: String(query.page ?? 1),
        length: String(query.limit ?? query.length ?? 10),
        filterableFields: [
          'status',
          'priority',
          'ticketType',
          'title',
          'ticketNumber',
          'dueDate',
          'createdAt',
          'createdBy',
          'createdBy._id',
          // 'projects',
          'projects._id',
        ],
        // useLean: true,
        useAggregation: true,
        aggregationPipeline: [
          // projects populate
          {
            $lookup: {
              from: 'projects',
              localField: 'projects',
              foreignField: '_id',
              as: 'projects',
              pipeline: [{ $project: { _id: 1, title: 1 } }],
            },
          },

          // {
          //   $unwind: { path: '$projects', preserveNullAndEmptyArrays: true },
          // },
          // createdBy populate
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
              pipeline: [{ $project: { _id: 1, name: 1, photo: 1 } }],
            },
          },
          {
            $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true },
          },
          // task counts per ticket
          {
            $lookup: {
              from: 'tasks',
              let: { ticketId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$ticketId', '$$ticketId'] }, { $eq: ['$isDeleted', false] }],
                    },
                  },
                },
                {
                  $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    completedTasks: {
                      $sum: {
                        $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
                      },
                    },
                  },
                },
              ],
              as: 'taskCounts',
            },
          },
          {
            $addFields: {
              totalTasks: { $ifNull: [{ $arrayElemAt: ['$taskCounts.totalTasks', 0] }, 0] },
              completedTasks: { $ifNull: [{ $arrayElemAt: ['$taskCounts.completedTasks', 0] }, 0] },
            },
          },
        ],
        excludeFields: [
          '__v',
          'isDeleted',
          'deletedAt',
          'deletedBy',
          'updatedAt',
          'updatedBy',
          'attachments',
          'taskCounts',
        ],
      });

      this.logger.log('tickets: SERVICE: ', tickets);

      return {
        success: true,
        message: 'Tickets fetched successfully',
        data: tickets.data,
        pagination: tickets.pagination,
      };
    } catch (err) {
      this.logger.error(
        'TicketService.getAllTickets failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  //all status tickets

  async getTicketsByStatus(status: string, query: TicketQueryDto) {
    this.logger.log(`SERVICE: ticket : getTicketsByStatus -> ${status}`);

    return this.getAllTickets({
      ...query,
      filter: mergeAndFilter(query.filter, {
        status__eq: status,
      }),
    });
  }

  async getTicketById(ticketId: string) {
    this.logger.log('SERVICE: ticket : getTicketById');

    try {
      const ticket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
        populate: [
          {
            path: 'projects',
            select: 'title',
          },
          {
            path: 'createdBy',
            select: 'name photo',
          },
        ],
        select: '-__v -isDeleted -updatedAt -deletedAt -deletedBy',
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      // ✅ H-04 — aggregate totalEstimatedTime and totalWorkTime from linked tasks
      const taskAggregates = await this.taskModel.aggregate([
        { $match: { ticketId: new Types.ObjectId(ticketId), isDeleted: false } },
        { $unwind: { path: '$worktime', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$_id',
            estimatedTime: { $first: '$estimatedTime' },
            status: { $first: '$status' },
            workTimeMs: {
              $sum: {
                $subtract: [
                  { $ifNull: ['$worktime.endTime', '$$NOW'] }, // Use current time if endTime is null
                  '$worktime.startTime',
                ],
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
            totalEstimatedTime: { $sum: '$estimatedTime' },
            totalWorkTimeMs: { $sum: '$workTimeMs' },
          },
        },
      ]);

      return {
        success: true,
        message: 'Ticket fetched successfully',
        data: {
          ...ticket,
          totalTasks: taskAggregates[0]?.totalTasks ?? 0,
          completedTasks: taskAggregates[0]?.completedTasks ?? 0,
          totalEstimatedTime: taskAggregates[0]
            ? minsToHHMM(taskAggregates[0].totalEstimatedTime)
            : '00:00',
          totalWorkTime: taskAggregates[0] ? msToHHMM(taskAggregates[0].totalWorkTimeMs) : '00:00',
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.getTicketById failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async deleteTicket(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('SERVICE: ticket : deleteTicket');

    try {
      const deletedTicket = await this.ticketRepository.softDeleteById(
        ticketId,
        {
          useLean: true,
        },
        {
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(currentUser.userId),
        },
      );

      if (!deletedTicket) {
        throw new NotFoundException('Ticket not found');
      }

      return {
        success: true,
        message: 'Ticket deleted successfully',
        data: null,
      };
    } catch (err) {
      this.logger.error(
        'TicketService.deleteTicket failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateTicket(
    ticketId: string,
    dto: UpdateTicketDto,
    currentUser: AuthenticatedUser,
    files: Express.Multer.File[] = [],
  ) {
    this.logger.log('BE HAPPY');

    try {
      this.logger.log(`ticketId: ${ticketId}`);
      // this.logger.log(dto);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      const uploadedAttachments = files.map((file) => `/uploads/tickets/${file.filename}`);

      const updatableFields: Partial<UpdateTicketDto> = {
        ...dto,
        ...(uploadedAttachments.length > 0 && { attachments: uploadedAttachments }),
        // updatedBy: new Types.ObjectId(currentUser.userId),
        updatedBy: currentUser.userId.toString(),
      };

      this.logger.log(updatableFields);

      const updatedTicket = await this.ticketRepository.updateByID(ticketId, updatableFields, {
        useLean: true,
        new: true,
      });

      return {
        success: true,
        message: 'Ticket updated successfully',
        data: updatedTicket,
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicket failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateTicketDueDate(
    ticketId: string,
    dto: UpdateTickeDueDatetDto,
    currentUser: AuthenticatedUser,
  ) {
    this.logger.log('BE HAPPY');
    try {
      this.logger.log(`ticketId: ${ticketId}`);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      // check invalid date format
      const newDueDate = new Date(dto.dueDate);
      if (isNaN(newDueDate.getTime())) {
        this.logger.error('Invalid date');
        throw new BadRequestException('Invalid date');
      }

      // check the date is not in the past — compare calendar dates only, ignore time-of-day
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      //check the date is not in the past
      if (newDueDate < today) {
        this.logger.error('Due date cannot be in the past');
        throw new BadRequestException('Due date cannot be in the past');
      }

      this.logger.log(newDueDate);

      const updatedTicket = await this.ticketRepository.updateByID(
        ticketId,
        {
          dueDate: newDueDate,
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        {
          useLean: true,
          new: true,
        },
      );

      if (!updatedTicket) {
        throw new NotFoundException('Ticket not found');
      }

      return {
        success: true,
        message: 'Ticket due date updated successfully',
        data: {
          _id: updatedTicket._id,
          ticketNumber: updatedTicket.ticketNumber,
          dueDate: updatedTicket.dueDate,
          updatedAt: updatedTicket.updatedAt,
          updatedBy: updatedTicket.updatedBy,
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicketDueDate failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateTicketQaStatus(
    ticketId: string,
    dto: UpdateTicketQaStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    this.logger.log('BE HAPPY');

    try {
      this.logger.log(`ticketId: ${ticketId}`);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      const updatedTicketQaStatus = await this.ticketRepository.updateByID(
        ticketId,
        {
          qaStatus: dto.qaStatus,
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        {
          // useLean: true,
          new: true,
        },
      );

      if (!updatedTicketQaStatus) {
        this.logger.error('Ticket not found or deleted during update');
        throw new NotFoundException('Ticket not found or deleted during update');
      }
      this.logger.log(updatedTicketQaStatus);
      return {
        success: true,
        message: 'Ticket QA status updated successfully',
        data: {
          _id: updatedTicketQaStatus._id,
          ticketNumber: updatedTicketQaStatus.ticketNumber,
          qaStatus: updatedTicketQaStatus.qaStatus,
          updatedAt: updatedTicketQaStatus.updatedAt,
          updatedBy: updatedTicketQaStatus.updatedBy,
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicketQaStatus failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }



    async updateTicketToOpen(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    try {
      this.logger.log(`ticketId: ${ticketId}`);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      const updatedTicketToOpen = await this.ticketRepository.updateByID(
        ticketId,
        {
          status: 'Open',
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        {
          useLean: true,
          new: true,
        },
      );

      if (!updatedTicketToOpen) {
        this.logger.error('Ticket not found or deleted during update');
        throw new NotFoundException('Ticket not found or deleted during update');
      }
      this.logger.log(updatedTicketToOpen);
      return {
        success: true,
        message: 'Ticket status updated to Open',
        data: {
          _id: updatedTicketToOpen._id,
          ticketNumber: updatedTicketToOpen.ticketNumber,
          status: updatedTicketToOpen.status,
          updatedAt: updatedTicketToOpen.updatedAt,
          updatedBy: updatedTicketToOpen.updatedBy,
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicketToOpen failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateTicketToInProgress(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    try {
      this.logger.log(`ticketId: ${ticketId}`);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      const updatedTicketInProgress = await this.ticketRepository.updateByID(
        ticketId,
        {
          status: 'In Progress',
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        {
          useLean: true,
          new: true,
        },
      );

      if (!updatedTicketInProgress) {
        this.logger.error('Ticket not found or deleted during update');
        throw new NotFoundException('Ticket not found or deleted during update');
      }
      this.logger.log(updatedTicketInProgress);
      return {
        success: true,
        message: 'Ticket status updated to In Progress',
        data: {
          _id: updatedTicketInProgress._id,
          ticketNumber: updatedTicketInProgress.ticketNumber,
          status: updatedTicketInProgress.status,
          updatedAt: updatedTicketInProgress.updatedAt,
          updatedBy: updatedTicketInProgress.updatedBy,
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicketToInProgress failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateTicketToDeveloped(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    try {
      this.logger.log(`ticketId: ${ticketId}`);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      // Check for any non-completed task still linked to this ticket
      const incompleteTask = await this.taskModel
        .findOne({
          ticketId: new Types.ObjectId(ticketId),
          isDeleted: false,
          status: { $ne: 'Completed' },
        })
        .lean();

      if (incompleteTask) {
        this.logger.error(`Ticket ${ticketId} has incomplete task(s), cannot move to Developed`);
        throw new BadRequestException(
          'All tasks must be completed before moving the ticket to Developed',
        );
      }

      const updatedTicketDeveloped = await this.ticketRepository.updateByID(
        ticketId,
        {
          status: 'Developed',
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        {
          useLean: true,
          new: true,
        },
      );

      if (!updatedTicketDeveloped) {
        this.logger.error('Ticket not found or deleted during update');
        throw new NotFoundException('Ticket not found or deleted during update');
      }
      this.logger.log(updatedTicketDeveloped);
      return {
        success: true,
        message: 'Ticket status updated to Developed',
        data: {
          _id: updatedTicketDeveloped._id,
          ticketNumber: updatedTicketDeveloped.ticketNumber,
          status: updatedTicketDeveloped.status,
          updatedAt: updatedTicketDeveloped.updatedAt,
          updatedBy: updatedTicketDeveloped.updatedBy,
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicketToDeveloped failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateTicketToQaInProgress(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    try {
      this.logger.log(`ticketId: ${ticketId}`);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      const updatedTicketQaInProgress = await this.ticketRepository.updateByID(
        ticketId,
        {
          status: 'QA In Progress',
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        {
          useLean: true,
          new: true,
        },
      );

      if (!updatedTicketQaInProgress) {
        this.logger.error('Ticket not found or deleted during update');
        throw new NotFoundException('Ticket not found or deleted during update');
      }
      this.logger.log(updatedTicketQaInProgress);
      return {
        success: true,
        message: 'Ticket status updated to QA In Progress',
        data: {
          _id: updatedTicketQaInProgress._id,
          ticketNumber: updatedTicketQaInProgress.ticketNumber,
          status: updatedTicketQaInProgress.status,
          updatedAt: updatedTicketQaInProgress.updatedAt,
          updatedBy: updatedTicketQaInProgress.updatedBy,
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicketToQaInProgress failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateTicketToReadyForRelease(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    try {
      this.logger.log(`ticketId: ${ticketId}`);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      const updatedTicketReadyForRelease = await this.ticketRepository.updateByID(
        ticketId,
        {
          status: 'Ready for Release',
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        {
          useLean: true,
          new: true,
        },
      );

      if (!updatedTicketReadyForRelease) {
        this.logger.error('Ticket not found or deleted during update');
        throw new NotFoundException('Ticket not found or deleted during update');
      }
      this.logger.log(updatedTicketReadyForRelease);
      return {
        success: true,
        message: 'Ticket status updated to Ready for Release',
        data: {
          _id: updatedTicketReadyForRelease._id,
          ticketNumber: updatedTicketReadyForRelease.ticketNumber,
          status: updatedTicketReadyForRelease.status,
          updatedAt: updatedTicketReadyForRelease.updatedAt,
          updatedBy: updatedTicketReadyForRelease.updatedBy,
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicketToReadyForRelease failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateTicketToReleased(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    try {
      this.logger.log(`ticketId: ${ticketId}`);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      const updatedTicketReleased = await this.ticketRepository.updateByID(
        ticketId,
        {
          status: 'Released',
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        {
          useLean: true,
          new: true,
        },
      );

      if (!updatedTicketReleased) {
        this.logger.error('Ticket not found or deleted during update');
        throw new NotFoundException('Ticket not found or deleted during update');
      }
      this.logger.log(updatedTicketReleased);
      return {
        success: true,
        message: 'Ticket status updated to Released',
        data: {
          _id: updatedTicketReleased._id,
          ticketNumber: updatedTicketReleased.ticketNumber,
          status: updatedTicketReleased.status,
          updatedAt: updatedTicketReleased.updatedAt,
          updatedBy: updatedTicketReleased.updatedBy,
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicketToReleased failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  async updateTicketToClosed(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    try {
      this.logger.log(`ticketId: ${ticketId}`);

      const existingTicket = await this.ticketRepository.findById({
        id: ticketId,
        useLean: true,
      });

      if (!existingTicket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      const updatedTicketClosed = await this.ticketRepository.updateByID(
        ticketId,
        {
          status: 'Closed',
          // updatedBy: currentUser.userId.toString(),
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        {
          useLean: true,
          new: true,
        },
      );

      if (!updatedTicketClosed) {
        this.logger.error('Ticket not found or deleted during update');
        throw new NotFoundException('Ticket not found or deleted during update');
      }
      this.logger.log(updatedTicketClosed);
      return {
        success: true,
        message: 'Ticket status updated to Closed',
        data: {
          _id: updatedTicketClosed._id,
          ticketNumber: updatedTicketClosed.ticketNumber,
          status: updatedTicketClosed.status,
          updatedAt: updatedTicketClosed.updatedAt,
          updatedBy: updatedTicketClosed.updatedBy,
        },
      };
    } catch (err) {
      this.logger.error(
        'TicketService.updateTicketToClosed failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }
}
