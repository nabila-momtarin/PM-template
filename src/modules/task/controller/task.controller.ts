import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query, UploadedFiles, UseInterceptors, } from "@nestjs/common";
import { TaskService } from "../service/task.service";
import { CreateTaskDto } from "../dto/create-task.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { AuthenticatedUser } from "src/infrastructure/auth/types/auth.types";
import { UpdateTaskDto } from "../dto/update-task.dto";
import { TaskDueDateUpdateDTO } from "../dto/task-due-date.dto";
import { TaskQueryDto } from "../dto/task-query.dto";

import { FilesInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from "src/common/upload/multer-options";

@Controller('tasks')
export class TaskController {
    constructor(private readonly taskService: TaskService) { }

    private readonly logger = new Logger(TaskController.name)

    @Post()
    @UseInterceptors(FilesInterceptor('attachments', 5, createMulterOptions('tasks')),)
    async createTask(@Body() dto: CreateTaskDto, @UploadedFiles() files: Express.Multer.File[], @CurrentUser() currentUser: AuthenticatedUser) {
        this.logger.log('WHO FORBID U TO BE HAPPY? JIO KHUSH RAHO... HAHA')
        return this.taskService.createTask(dto, files, currentUser);
    }

    @Get(':id')
    async getTask(@Param('id') id: string) {
        this.logger.debug('..');
        return this.taskService.getTask(id);
    }

    @Delete(':id')
    async deleteTask(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
        this.logger.debug('..');
        return this.taskService.deleteTask(id, currentUser);
    }


    @Patch(':id')
    async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() currentUser: AuthenticatedUser) {
        this.logger.debug('..');
        return this.taskService.updateTask(id, dto, currentUser);
    }

    @Patch(':id/due-date')
    dueDateUpdateTask(@Param('id') id: string, @Body() dto: TaskDueDateUpdateDTO, @CurrentUser() currentUser: AuthenticatedUser) {

        this.logger.debug('...');

        return this.taskService.TaskDueDateUpdate(id, dto, currentUser);
    }


    @Get()
    async getAllTasks(@Query() query: TaskQueryDto) {
        this.logger.debug('..');
        return this.taskService.getAllTask(query);
    }
}