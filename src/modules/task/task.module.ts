import { Module } from "@nestjs/common";
import { TaskService } from "./service/task.service";
import { TaskRepository } from "./repositroy/task.repository";
import { TaskController } from "./controller/task.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Task, TaskSchema } from "./entities/task.schema";
import { CounterService } from "src/common/services/counter.service";


@Module({
    imports: [
        MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }])
    ],
    controllers: [TaskController],
    providers: [TaskService, TaskRepository,  CounterService],
    exports: []
})

export class TaskModule { }