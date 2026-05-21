import { Module } from "@nestjs/common";

import { MongooseModule } from "@nestjs/mongoose";
import { Project, ProjectSchema } from "./entities/project.schema";
import { ProjectController } from "./controller/project.controller";
import { ProjectService } from "./service/project.service";
import { ProjectRepository } from "./repositroy/project.repository";


@Module({
    imports: [
        MongooseModule.forFeature([{ 
            name: Project.name, 
            schema: ProjectSchema 
        }])
    ],
    controllers: [ProjectController],
    providers: [ProjectService, ProjectRepository],
    exports: []
})

export class ProjectModule {}