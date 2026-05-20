import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectService } from '../service/project.service';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectQueryDto } from '../dto/getAll-project.dto';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto /* , userId: string */) {
    console.log('Project CONTROLLER: create\n');

    const project = await this.projectService.create(createProjectDto /* , userId */);

    return project;
  }

  @Get()
  async findAll(@Query() query: ProjectQueryDto) {
    console.log('Project CONTROLLER: findAll\n');

    const result = await this.projectService.findAll(query);

    return result;
  }

  @Get(':projectId')
  async getProjectById(@Param('projectId') projectId: string) {
    console.log('Project CONTROLLER: getProjectById\n');

    const result = await this.projectService.getProjectById(projectId);

    return result;
  }

  @Delete(':projectId')
  async deleteByIdProject(@Param('projectId') projectId: string) {
    console.log('Project CONTROLLER: deleteByIdProject\n');

    const result = await this.projectService.deleteByIdProject(projectId);

    return result;
  }

  @Patch(':projectId')
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    console.log('Project CONTROLLER: updateProject\n');

    const result = await this.projectService.updateProject(projectId, updateProjectDto);

    console.log(`Updated Project: SERVICE: ${result}`);

    return result;
  }
}
