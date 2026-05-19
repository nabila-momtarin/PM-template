import { Injectable, Logger } from "@nestjs/common";
import { CreateTaskDto } from "../dto/create-task.dto";
import { AuthenticatedUser } from "src/infrastructure/auth/types/auth.types";
import { TaskRepository } from "../task.repository";
import { Types } from "mongoose";
import { Task,  } from "../entities/task.schema";

@Injectable()
export class TaskService {
    constructor(private readonly taskrepository: TaskRepository) { }

    private readonly logger = new Logger(TaskService.name)

    private async generateTaskNumber(): Promise<string> {
        const totalTasks = await this.taskrepository.countDocuments();

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
            createdBy: new Types.ObjectId(currentUser.userId)
        };

        const newTask = await this.taskrepository.createOne(taskPayload);

        this.logger.log(newTask);

        return {
            success: true,
            message: "Task created successfully",
            data: newTask
        }
    }
}