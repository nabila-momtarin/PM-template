import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SummaryController } from './controller/summary.controller';
import { User, UserSchema } from '../user/entities/user.schema';
import { Task, TaskSchema } from '../task/entities/task.schema';
import { Ticket, TicketSchema } from '../ticket/entities/ticket.schema';
import { SummaryService } from './service/summary.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name,   schema: UserSchema },
      { name: Task.name,   schema: TaskSchema },
      { name: Ticket.name, schema: TicketSchema },
    ]),
  ],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}