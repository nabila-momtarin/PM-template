import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TaskService } from '../service/task.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskDueDateUpdateDTO } from '../dto/task-due-date.dto';
import { TaskQueryDto } from '../dto/task-query.dto';

import { FilesInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from 'src/common/upload/multer-options';
import { JwtAuthGuard } from 'src/infrastructure/auth/guards/jwt-auth.guard';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  private readonly logger = new Logger(TaskController.name);

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 5, createMulterOptions('tasks')))
  async createTask(
    @Body() dto: CreateTaskDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.log('WHO FORBID U TO BE HAPPY? JIO KHUSH RAHO... HAHA');
    return this.taskService.createTask(dto, files, currentUser);
  }

  // ── Status shortcut routes MUST stay before @Get(':taskId') ──

  @Get('todo')
  async getTodoTasks(@Query() query: TaskQueryDto) {
    return this.taskService.getTasksByStatus('Todo', query);
  }

  @Get('in-progress')
  async getInProgressTasks(@Query() query: TaskQueryDto) {
    return this.taskService.getTasksByStatus('In Progress', query);
  }

  @Get('completed')
  async getCompletedTasks(@Query() query: TaskQueryDto) {
    return this.taskService.getTasksByStatus('Completed', query);
  }

  @Get('anomaly')
  async getAnomalyTasks(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.taskService.getAnomalyTasks(
      startDate,
      endDate,
      Math.max(1, parseInt(page, 10) || 1),
      Math.max(1, parseInt(limit, 10) || 10),
    );
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

  @Patch(':id/start')
  // @UseGuards(JwtAuthGuard)   ← REMOVE THIS
  async startTask(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    this.logger.debug('..');
    console.log('>>> START HIT, currentUser:', currentUser);
    return this.taskService.startTask(id, currentUser);
  }

  @Patch(':id/pause')
  // @UseGuards(JwtAuthGuard)   ← REMOVE THIS
  async pauseTask(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    this.logger.debug('..');
    return this.taskService.pauseTask(id, currentUser);
  }

  @Patch(':id/complete')
  // @UseGuards(JwtAuthGuard)   ← REMOVE THIS
  async completeTask(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    this.logger.debug('..');
    return this.taskService.completeTask(id, currentUser);
  }

  @Patch(':id/due-date')
  dueDateUpdateTask(
    @Param('id') id: string,
    @Body() dto: TaskDueDateUpdateDTO,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.debug('...');

    return this.taskService.TaskDueDateUpdate(id, dto, currentUser);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('attachments', 5, createMulterOptions('tasks')))
  async updateTask(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.debug('..');
    return this.taskService.updateTask(id, dto, files, currentUser);
  }

  @Get()
  async getAllTasks(@Query() query: TaskQueryDto) {
    this.logger.debug('..');
    return this.taskService.getAllTask(query);
  }
}
