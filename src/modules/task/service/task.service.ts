import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from '../dto/create-task.dto';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { TaskRepository } from '../task.repository';
import { Types } from 'mongoose';
import { Task } from '../entities/task.schema';
import { UpdateTaskDto } from '../dto/update-task.dto';

@Injectable()
export class TaskService {
    constructor(private readonly taskRepository: TaskRepository) { }

    private readonly logger = new Logger(TaskService.name);

    private async generateTaskNumber(): Promise<string> {
        const totalTasks = await this.taskRepository.countDocuments();

        return 'TASK-' + (totalTasks + 1);
    }
    async createTask(dto: CreateTaskDto, currentUser: AuthenticatedUser) {
        this.logger.log('HAPPI HAPPI HAPPI');

        const taskNumber = await this.generateTaskNumber();
        this.logger.log(`Generated task number: ${taskNumber}`);

        const taskPayload: Partial<Task> = {
            ...dto,
            taskNumber: taskNumber,
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
    }

    async getTask(id: string) {
        this.logger.debug('..');

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
            ]
        });

        if (!task) {
            this.logger.error('Task not found for : ', id);
            throw new NotFoundException('Task not found');
        }
        this.logger.debug('Task : ', task);

        const { projectId, ticketId, ...resTask } = task;

        return {
            success: true,
            message: 'Task fetched successfully',
            data: {
                ...resTask,
                project: projectId,
                ticket: ticketId,
            },
        };
    }

    
    async deleteTask(id: string, currentUser: AuthenticatedUser) {
        this.logger.debug('..');

        if (!Types.ObjectId.isValid(id)) {
            this.logger.error('Invalid task id');
            throw new BadRequestException('Invalid task id');
        }

        const deletedTask = await this.taskRepository.softDeleteById(
            id,
            { useLean: true },
            {
                deletedAt: new Date(),
                deletedBy: new Types.ObjectId(currentUser.userId)
            }
        );

        if (!deletedTask) {
            this.logger.error('Task not found for : ', id);
            throw new NotFoundException('Task not found or Cannot be deleted');
        }

        return {
            success: true,
            message: 'Task deleted successfully',
            data: { deletedAt: deletedTask.deletedAt },
        }
    }

}