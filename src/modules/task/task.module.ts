import { Module } from '@nestjs/common';
import { TaskService } from './service/task.service';
import { TaskRepository } from './repositroy/task.repository';
import { TaskController } from './controller/task.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './entities/task.schema';
import { CounterService } from 'src/common/services/counter.service';
import { Project, ProjectSchema } from "../project/entities/project.schema";
import { Ticket, TicketSchema } from '../ticket/entities/ticket.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [TaskController],
  providers: [TaskService, TaskRepository, CounterService],
  exports: [],
})
export class TaskModule {}
