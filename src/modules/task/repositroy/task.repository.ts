import { InjectModel } from "@nestjs/mongoose";
import { BaseRepository } from "src/common/repositories/base.repository";
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { Task, TaskDocument } from "../entities/task.schema";


@Injectable()
export class TaskRepository extends BaseRepository<TaskDocument> {
    constructor(@InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>) {
        super(taskModel);

    }
}