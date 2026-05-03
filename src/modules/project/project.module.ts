import { Module } from "@nestjs/common";

import { ProjectService } from "./project.service";
import { ProjectRepository } from "./project.repository";
import { MongooseModule } from "@nestjs/mongoose";
import { Project, ProjectSchema } from "./entities/project.schema";
import { ProjectController } from "./http/project.controller";


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