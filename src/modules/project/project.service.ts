import { Injectable } from "@nestjs/common";
import { ProjectRepository } from "./project.repository";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ProjectDocument } from "./entities/project.schema";


@Injectable()
export class ProjectService {
    constructor( private readonly projectRepository: ProjectRepository) {}
    async create(createProjectDto: CreateProjectDto/* , userId: string */) : Promise<ProjectDocument>{

        console.log('Project SERVICE: create\n');
        
        const newProject = await this.projectRepository.createOne({
            ...createProjectDto,
            // createdBy: userId,
        });

        console.log("newProject: SERVICE: ", newProject);

        return newProject;

    }
} 