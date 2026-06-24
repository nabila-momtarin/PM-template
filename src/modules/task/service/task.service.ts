import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateTaskDto } from '../dto/create-task.dto';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { TaskRepository } from '../repositroy/task.repository';
import { Model, Types } from 'mongoose';
import { Task } from '../entities/task.schema';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskDueDateUpdateDTO } from '../dto/task-due-date.dto';
import { TaskQueryDto } from '../dto/task-query.dto';

import { mergeAndFilter } from 'src/common/utils/params-decoder';
import { CounterService } from 'src/common/services/counter.service';

import * as fs from 'fs';
import { Project, ProjectDocument } from 'src/modules/project/entities/project.schema';
import { Ticket, TicketDocument } from 'src/modules/ticket/entities/ticket.schema';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly counterService: CounterService,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
  ) {}

  private readonly logger = new Logger(TaskService.name);

  private async generateTaskNumber(): Promise<string> {
    const seq = await this.counterService.generate('taskCounter');
    return `TASK-${seq}`;
  }
  async createTask(
    dto: CreateTaskDto,
    files: Express.Multer.File[] = [],
    currentUser: AuthenticatedUser,
  ) {
    this.logger.log('HAPPI HAPPI HAPPI');

    try {
      //── Validate ticket exists (non-deleted) ──
      const ticket = await this.ticketModel
        .findOne({ _id: dto.ticketId, isDeleted: { $ne: true } })
        .lean();
      if (!ticket) {
        this.logger.error('Ticket not found');
        throw new NotFoundException('Ticket not found');
      }

      // ── Guard: ticket must have a due date before any task can be created ──
      if (!ticket.dueDate) {
        this.logger.error(`Ticket ${dto.ticketId} has no due date — cannot create task`);
        throw new BadRequestException(
          'The associated ticket must have a due date before a task can be created',
        );
      }

      // ── Validate project exists (non-deleted) ──
      const project = await this.projectModel
        .findOne({ _id: dto.projectId, isDeleted: { $ne: true } })
        .lean();
      if (!project) {
        this.logger.error('Project not found');
        throw new NotFoundException('Project not found');
      }

      // ── Case 1: validate or auto-link project depending on ticket's current state ──
      const ticketProjects = ticket.projects ?? [];

      if (ticketProjects.length > 0) {
        // ── Case 1: project must be present in the ticket's projects[] ──
        const projectIsLinkedToTicket = ticketProjects.some((p) => p.toString() === dto.projectId);
        if (!projectIsLinkedToTicket) {
          this.logger.error('Project is not associated with the given ticket');
          throw new BadRequestException('Project is not associated with the given ticket');
        }
      } else {
        // ── Case 2: auto-link the project to the ticket if it's not already linked ──
        this.logger.log(
          `Ticket ${dto.ticketId} has no associated project — linking ${dto.projectId}`,
        );

        const updateResult = await this.ticketModel.updateOne(
          { _id: dto.ticketId, isDeleted: { $ne: true } },
          { $addToSet: { projects: new Types.ObjectId(dto.projectId) } },
        );

        if (updateResult.matchedCount === 0) {
          this.logger.error('Ticket disappeared during auto-link');
          throw new NotFoundException('Ticket not found');
        }
      }

      // ── Case : task due date >= ticket due date ──
      let taskDueDate: Date;

      if (dto.dueDate) {
        const parsedDueDate = new Date(dto.dueDate);

        if (isNaN(parsedDueDate.getTime())) {
          this.logger.error('Invalid due date');
          throw new BadRequestException('Invalid due date');
        }

        if (parsedDueDate > ticket.dueDate) {
          this.logger.error('Task due date cannot be later than the ticket due date');
          throw new BadRequestException(
            'Task due date cannot be later than the due date of the associated ticket',
          );
        }

        taskDueDate = parsedDueDate;
      } else {
        // Not provided → default to the ticket's due date
        taskDueDate = ticket.dueDate;
      }

      const taskNumber = await this.generateTaskNumber();
      this.logger.log(`Generated task number: ${taskNumber}`);

      const uploadedAttachments = files.map((file) => `/uploads/tasks/${file.filename}`);

      this.logger.log(uploadedAttachments);

      const taskPayload: Partial<Task> = {
        ...dto,
        taskNumber: taskNumber,
        attachments: uploadedAttachments,
        projectId: new Types.ObjectId(dto.projectId),
        ticketId: new Types.ObjectId(dto.ticketId),
        assignee: new Types.ObjectId(dto.assignee),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdBy: new Types.ObjectId(currentUser.userId),
      };

      const newTask = await this.taskRepository.createOne(taskPayload);

      this.logger.log(newTask);

      return {
        success: true,
        message: 'Task created successfully',
        data: newTask,
      };
    } catch (err) {
      this.logger.error(err);
      this.logger.error('TaskService.createTask failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async getAllTask(query: TaskQueryDto) {
    this.logger.debug('..');

    try {
      const tasks = await this.taskRepository.getAllData({
        filter: query.filter ?? '{}',
        sortStr: query.sort ?? '-createdAt',
        page: String(query.page ?? 1),
        length: String(query.limit ?? query.length ?? 10),
        filterableFields: [
          'status',
          'assignee',
          'assignee._id',
          'projectId',
          'ticketId',
          'title',
          'dueDate',
          'taskNumber',
        ],
        useLean: true,
        useAggregation: true,
        aggregationPipeline: [
          // assignee populate with only name and photo
          {
            $lookup: {
              from: 'users',
              localField: 'assignee',
              foreignField: '_id',
              as: 'assignee',
              pipeline: [{ $project: { _id: 1, name: 1, photo: 1 } }], // only include _id, name, and photo in the assignee details
            },
          },
          {
            $unwind: {
              path: '$assignee',
              preserveNullAndEmptyArrays: true, // assignee না থাকলেও task return হবে
            },
          },
          // createdBy populate with only name and photo
          {
            $lookup: {
              from: 'users',
              localField: 'createdBy',
              foreignField: '_id',
              as: 'createdBy',
              pipeline: [{ $project: { _id: 1, name: 1, photo: 1 } }], // only include _id, name, and photo in the createdBy details
            },
          },
          {
            $unwind: {
              path: '$createdBy',
              preserveNullAndEmptyArrays: true, // createdBy না থাকলেও task return হবে
            },
          },
          // project
          {
            $lookup: {
              from: 'projects',
              localField: 'projectId',
              foreignField: '_id',
              as: 'project',
              pipeline: [{ $project: { _id: 1, title: 1 } }],
            },
          },
          { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },

          // ticket populate with only : _id, ticketNumber, priority
          {
            $lookup: {
              from: 'tickets',
              localField: 'ticketId',
              foreignField: '_id',
              as: 'ticket',
              pipeline: [{ $project: { _id: 1, ticketNumber: 1, priority: 1 } }],
            },
          },
          { $unwind: { path: '$ticket', preserveNullAndEmptyArrays: true } },
        ],
        // excludeFields: ['-__v -isDeleted -updatedAt -deletedAt -deletedBy -attachments -ticketId'],
        excludeFields: [
          '__v',
          'projectId',
          'attachments',
          'ticketId',
          'isDeleted',
          'deletedAt',
          'deletedBy',
          'updatedAt',
          'updatedBy',
        ],
      });

      this.logger.log('tasks: SERVICE: ', tasks);

      return {
        success: true,
        message: 'Tasks fetched successfully',
        data: tasks.data,
        pagination: tasks.pagination,
      };
    } catch (err) {
      this.logger.error(err);
      this.logger.error('TaskService.getAllTask failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async getTasksByStatus(status: string, query: TaskQueryDto) {
    this.logger.log(`SERVICE: task : getTasksByStatus -> ${status}`);

    return this.getAllTask({
      ...query,
      filter: mergeAndFilter(query.filter, {
        status__eq: status,
      }),
    });
  }

  async getTask(id: string) {
    this.logger.debug('..');

    try {
      if (!Types.ObjectId.isValid(id)) {
        this.logger.error('Invalid task id');
        throw new BadRequestException('Invalid task id');
      }

      const task = await this.taskRepository.findById({
        id,
        useLean: true,
        select: '-__v -isDeleted -updatedAt -deletedAt -deletedBy',
        populate: [
          {
            path: 'assignee',
            select: 'name photo',
          },
          {
            path: 'projectId',
            select: 'title type',
          },
          {
            path: 'createdBy',
            select: 'name photo',
          },
          {
            path: 'ticketId',
            select: 'ticketNumber priority',
          },
        ],
      });

      if (!task) {
        this.logger.error('Task not found for : ', id);
        throw new NotFoundException('Task not found');
      }
      this.logger.debug('Task : ', task);

      const { projectId, ticketId, ...resTask } = task;

      const ticket =
        ticketId && typeof ticketId === 'object' && 'priority' in ticketId ? ticketId : null;
      // const project = projectId && typeof projectId === 'object' ? projectId : null;

      return {
        success: true,
        message: 'Task fetched successfully',
        data: {
          ...resTask,
          // derived field from populated ticket
          priority: ticket?.priority ?? null,
          project: projectId,
          ticket /* : ticketId */,
        },
      };
    } catch (err) {
      this.logger.error(err);
      this.logger.error('TaskService.getTask failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async deleteTask(id: string, currentUser: AuthenticatedUser) {
    this.logger.debug('..');

    try {
      if (!Types.ObjectId.isValid(id)) {
        this.logger.error('Invalid task id');
        throw new BadRequestException('Invalid task id');
      }

      const deletedTask = await this.taskRepository.softDeleteById(
        id,
        { useLean: true },
        {
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(currentUser.userId),
        },
      );

      if (!deletedTask) {
        this.logger.error('Task not found for : ', id);
        throw new NotFoundException('Task not found or Cannot be deleted');
      }

      return {
        success: true,
        message: 'Task deleted successfully',
        data: { deletedAt: deletedTask.deletedAt },
      };
    } catch (err) {
      this.logger.error(err);
      this.logger.error('TaskService.deleteTask failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async updateTask(
    id: string,
    dto: UpdateTaskDto,
    files: Express.Multer.File[],
    currentUser: AuthenticatedUser,
  ) {
    const task = await this.taskRepository.findById({ id });
    if (!task) throw new NotFoundException('Task not found');

    // If assignee is being changed while task is In Progress — seal the open timer
    if (dto.assignee && task.status === 'In Progress') {
      await this.taskRepository.updateOne(
        { _id: id, 'worktime.endTime': null },
        { $set: { 'worktime.$.endTime': new Date() } },
      );
      dto['status'] = 'Todo'; // reset to Todo for the new assignee
    }

    const { removeAttachments, ...restDto } = dto; // strip non-schema field

    const updatePayload = {
      ...restDto,
      ...(dto.assignee && { assignee: new Types.ObjectId(dto.assignee) }),
      updatedBy: new Types.ObjectId(currentUser.userId),
    };

    // remove requested attachments first
    let baseAttachments = task.attachments ?? [];
    if (removeAttachments?.length) {
      const toRemove = new Set(removeAttachments);
      baseAttachments = baseAttachments.filter((path) => !toRemove.has(path));

      for (const path of removeAttachments) {
        fs.unlink(`.${path}`, (err) => {
          if (err) this.logger.warn(`Failed to delete attachment file: ${path}`, err);
        });
      }
    }

    if (files && files.length > 0) {
      const uploadedAttachments = files.map((file) => `/uploads/tasks/${file.filename}`);
      updatePayload['attachments'] = [
        // ...(task.attachments ?? []), // existing ones
        ...baseAttachments, // existing ones (after removal applied)
        ...uploadedAttachments, // new ones appended
      ];
    } else if (removeAttachments?.length) {
      // only a removal happened, no new files — still must persist the trimmed list
      updatePayload['attachments'] = baseAttachments;
    }

    const updated = await this.taskRepository.updateByID(id, updatePayload, { new: true });
    return { success: true, message: 'Task updated successfully', data: updated };
  }

  // START  (Todo → In Progress)
  // ──────────────────────────────────────────
  async startTask(id: string, currentUser: AuthenticatedUser) {
    const task = await this.taskRepository.findById({ id });
    if (!task) throw new NotFoundException('Task not found');

    console.log('assignee raw:', task.assignee);
    console.log('assignee toString:', task.assignee?.toString());
    console.log('currentUser.userId:', currentUser.userId);
    console.log('match?', task.assignee?.toString() === currentUser.userId);

    if (task.assignee.toString() !== currentUser.userId)
      throw new ForbiddenException('Only the assigned user can start this task');

    if (task.status === 'Completed')
      throw new BadRequestException('Completed tasks cannot be reopened');
    if (task.status === 'In Progress') throw new BadRequestException('Task is already In Progress');

    const conflict = await this.taskRepository.findOne({
      filters: {
        assignee: task.assignee,
        status: 'In Progress',
        _id: { $ne: id },
        isDeleted: false,
      },
    });
    if (conflict)
      throw new BadRequestException(
        'You already have a task In Progress. Pause it before starting another.',
      );

    const updated = await this.taskRepository.updateOne(
      { _id: id },
      {
        $set: {
          status: 'In Progress',
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
        $push: { worktime: { startTime: new Date(), endTime: null } },
      },
    );

    console.log('startTask updated result:', JSON.stringify(updated));

    return { success: true, message: 'Task started successfully', data: updated };
  }

  // PAUSE  (In Progress → Todo)
  // ──────────────────────────────────────────
  async pauseTask(id: string, currentUser: AuthenticatedUser) {
    const task = await this.taskRepository.findById({ id });
    if (!task) throw new NotFoundException('Task not found');

    if (task.status !== 'In Progress')
      throw new BadRequestException('Task is not currently In Progress');

    // pauseTask — replace the filter:
    const updated = await this.taskRepository.updateOne(
      { _id: id, 'worktime.endTime': { $in: [null, undefined] } }, // ← handles both
      {
        $set: {
          status: 'Todo',
          'worktime.$.endTime': new Date(),
          updatedBy: new Types.ObjectId(currentUser.userId),
        },
      },
    );

    return { success: true, message: 'Task paused successfully', data: updated };
  }

  // COMPLETE  (In Progress | Todo → Completed)
  // ──────────────────────────────────────────
  async completeTask(id: string, currentUser: AuthenticatedUser) {
    const task = await this.taskRepository.findById({ id });
    if (!task) throw new NotFoundException('Task not found');

    if (task.status === 'Completed') throw new BadRequestException('Task is already completed');

    if (task.status === 'Todo' && task.worktime.length === 0)
      throw new BadRequestException('Start the task before completing it.');

    const now = new Date();

    if (task.status === 'In Progress') {
      // Seal open entry AND mark completed in ONE atomic operation
      const updated = await this.taskRepository.updateOne(
        { _id: id, 'worktime.endTime': null },
        {
          $set: {
            status: 'Completed',
            completionDate: now,
            'worktime.$.endTime': now, // ← seal the open entry
            updatedBy: new Types.ObjectId(currentUser.userId),
          },
        },
      );
      return { success: true, message: 'Task completed successfully', data: updated };
    }

    // Todo → Completed (sessions already sealed, just close out)
    // completeTask In Progress branch — same fix:
    // const updated = await this.taskRepository.updateOne(
    //   { _id: id, 'worktime.endTime': { $in: [null, undefined] } }, // ← handles both
    //   {
    //     $set: {
    //       status: 'Completed',
    //       completionDate: now,
    //       'worktime.$.endTime': now,
    //       updatedBy: new Types.ObjectId(currentUser.userId),
    //     },
    //   },
    // );

    const updated = await this.taskRepository.updateByID(
      id,
      {
        status: 'Completed',
        completionDate: now,
        updatedBy: new Types.ObjectId(currentUser.userId),
      },
      { new: true },
    );

    return { success: true, message: 'Task completed successfully', data: updated };
  }

  async TaskDueDateUpdate(id: string, dto: TaskDueDateUpdateDTO, currentUser: AuthenticatedUser) {
    this.logger.log('...');
    this.logger.log(`task id: ${id}`);

    try {
      const existingTask = await this.taskRepository.findById({
        id: id,
        useLean: true,
      });

      if (!existingTask) {
        this.logger.error('Task not found');
        throw new NotFoundException('Task not found');
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

      const updatedTask = await this.taskRepository.updateByID(
        id,
        {
          dueDate: newDueDate,
          updatedBy: currentUser.userId.toString(),
        },
        {
          useLean: true,
          new: true,
        },
      );

      return {
        success: true,
        message: 'Task due date updated successfully',
        data: {
          _id: existingTask._id,
          taskNumber: existingTask.taskNumber,
          dueDate: newDueDate,
          updatedAt: new Date(),
          updatedBy: currentUser.userId.toString(),
        },
      };
    } catch (err) {
      this.logger.error(err);
      this.logger.error(
        'TaskService.TaskDueDateUpdate failed',
        err instanceof Error ? err.stack : err,
      );
      throw err;
    }
  }

  //   private buildTaskFilter(query: TaskQueryDto): Record<string, any> {
  //     const filter: Record<string, any> = {};

  //     if (query.status) {
  //       filter.status__eq = query.status;
  //     }

  //     // if (query.assignee) {
  //     //     filter.assignee__in = [query.assignee];
  //     // }

  //     // if (query.projectId) {
  //     //     filter.projectId__in = [query.projectId];
  //     // }

  //     // if (query.ticketId) {
  //     //     filter.ticketId__in = [query.ticketId];
  //     // }

  //     if (query.search) {
  //       filter.title__like = query.search;
  //     }

  //     return filter;
  //   }
}
