import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from '../dto/create-task.dto';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { TaskRepository } from '../repositroy/task.repository';
import { Types } from 'mongoose';
import { Task } from '../entities/task.schema';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskDueDateUpdateDTO } from '../dto/task-due-date.dto';
import { TaskQueryDto } from '../dto/task-query.dto';

import { mergeAndFilter } from 'src/common/utils/params-decoder';

@Injectable()
export class TaskService {
  constructor(private readonly taskRepository: TaskRepository) {}

  private readonly logger = new Logger(TaskService.name);

  private async generateTaskNumber(): Promise<string> {
    const totalTasks = await this.taskRepository.countDocuments();

    return 'TASK-' + (totalTasks + 1);
  }
  async createTask(
    dto: CreateTaskDto,
    files: Express.Multer.File[] = [],
    currentUser: AuthenticatedUser,
  ) {
    this.logger.log('HAPPI HAPPI HAPPI');

    try {
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
        filterableFields: ['status', 'assignee', 'projectId', 'ticketId', 'title'],
        useLean: true,
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
        select: '-__v -attachments -isDeleted -updatedAt -deletedAt -deletedBy -createdBy',
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

      const ticket = ticketId && typeof ticketId === 'object' && 'priority' in ticketId ? ticketId : null;
      // const project = projectId && typeof projectId === 'object' ? projectId : null;

      return {
        success: true,
        message: 'Task fetched successfully',
        data: {
          ...resTask,
          // derived field from populated ticket
          priority: ticket?.priority ?? null,
          project: projectId,
          ticket/* : ticketId */,
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

  async updateTask(id: string, dto: UpdateTaskDto, currentUser: AuthenticatedUser) {
    this.logger.debug('..');

    try {
      if (!Types.ObjectId.isValid(id)) {
        this.logger.error('Invalid task id');
        throw new BadRequestException('Invalid task id');
      }

      const taskToUpdate = await this.taskRepository.findById({ id, useLean: true });

      this.logger.debug('update DTO: ', dto);

      if (!taskToUpdate) {
        this.logger.error('Task not found for : ', id);
        throw new NotFoundException('Task not found');
      }

      if (dto.status && dto.status === 'In Progress') {
        const conflict = await this.taskRepository.findOne({
          filters: {
            assignee: taskToUpdate.assignee,
            status: 'In Progress',
            _id: { $ne: id }, // exclude the task being updated itself
            isDeleted: false,
          },
        });

        if (conflict) {
          this.logger.error(
            'This user already has a task in progress. Complete or pause it before starting another.',
          );
          throw new BadRequestException(
            'This user already has a task in progress. Complete or pause it before starting another.',
          );
        }
      }

      const updatePayload = {
        ...dto,
        assignee: new Types.ObjectId(dto.assignee),
        updatedBy: new Types.ObjectId(currentUser.userId),
        updatedAt: new Date(),
      };

      const updatedTask = await this.taskRepository.updateByID(id, updatePayload, {
        useLean: true,
        new: true,
      });

      this.logger.debug('Updated Task : ', updatedTask);

      return {
        success: true,
        message: 'Task updated successfully',
        data: updatedTask,
      };
    } catch (err) {
      this.logger.error(err);
      this.logger.error('TaskService.updateTask failed', err instanceof Error ? err.stack : err);
      throw err;
    }
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

      //check the date is not in the past
      if (newDueDate < new Date()) {
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
