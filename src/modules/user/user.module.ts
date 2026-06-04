import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.schema';

import { AdminController } from './controllers/admin.controller';
import { RoleModule } from '../role/role.module';
import { UserRepository } from './repositroy/user.repository';
import { AdminService } from './service/admin.service';
import { MyService } from './service/me.service';
import { MyController } from './controllers/me.controller';
import { Ticket, TicketSchema } from '../ticket/entities/ticket.schema';
import { MyPriorityService } from './service/my-priority.service';
import { Task, TaskSchema } from '../task/entities/task.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Ticket.name, schema: TicketSchema },
    ]),
    forwardRef(() => RoleModule),
  ],
  controllers: [AdminController, MyController],
  providers: [UserRepository, AdminService, MyService, MyPriorityService],
  exports: [UserRepository],
})
export class UserModule {}
