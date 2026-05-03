import { Body, Controller, Post } from "@nestjs/common";
import { CreateProjectDto } from "../dto/create-project.dto";
import { ProjectService } from "../project.service";


@Controller('projects')
export class ProjectController {
    constructor( private readonly projectService: ProjectService) {}

    @Post()
    async create( @Body() createProjectDto: CreateProjectDto/* , userId: string */) {
        console.log('Project CONTROLLER: create\n');

        const project =  await this.projectService.create(createProjectDto/* , userId */);

        return project;
    }
}