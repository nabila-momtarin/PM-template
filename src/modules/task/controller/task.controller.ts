import { Body, Controller, Delete, Get, Logger, Param, Patch, Post } from "@nestjs/common";
import { TaskService } from "../service/task.service";
import { CreateTaskDto } from "../dto/create-task.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { AuthenticatedUser } from "src/infrastructure/auth/types/auth.types";
import { UpdateTaskDto } from "../dto/update-task.dto";

@Controller('tasks')
export class TaskController {
    constructor( private readonly taskService: TaskService) {}

    private readonly logger = new Logger(TaskController.name)

    @Post()
    async createTask( @Body() dto: CreateTaskDto, @CurrentUser() currentUser: AuthenticatedUser) {
        this.logger.log('WHO FORBID U TO BE HAPPY? JIO KHUSH RAHO... HAHA')
        return this.taskService.createTask( dto, currentUser );
    }

    @Get(':id')
    async getTask ( @Param('id') id: string ) {
        this.logger.debug('..');
        return this.taskService.getTask( id );
    }

   


}