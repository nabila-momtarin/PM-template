import { InjectModel } from "@nestjs/mongoose";
import { BaseRepository } from "src/common/repositories/base.repository";
import { Task, TaskDocument } from "./entities/task.schema";
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";


@Injectable()
export class TaskRepository extends BaseRepository<TaskDocument> {
    constructor(@InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>) {
        super(taskModel);

    }
}