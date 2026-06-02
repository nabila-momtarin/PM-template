import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectService } from '../service/project.service';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectQueryDto } from '../dto/getAll-project.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) { }

  private readonly logger = new Logger(ProjectController.name);


  @Post()
  async create(@Body() createProjectDto: CreateProjectDto , @CurrentUser() currentUser: AuthenticatedUser) {

    this.logger.log('..');

    const project = await this.projectService.create(createProjectDto, currentUser);
    return project;
  }

  @Get()
  async findAll(@Query() query: ProjectQueryDto) {

    this.logger.log('..');

    const result = await this.projectService.findAll(query);

    return result;
  }

  @Get(':projectId')
  async getProjectById(@Param('projectId') projectId: string) {

    this.logger.log('..');

    const result = await this.projectService.getProjectById(projectId);

    return result;
  }

  @Delete(':projectId')
  async deleteByIdProject(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {

    this.logger.log('..');

    const result = await this.projectService.deleteByIdProject(projectId, user);

    return result;
  }

  @Patch(':projectId')
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {

    this.logger.log('..');

    const result = await this.projectService.updateProject(projectId, updateProjectDto);

    this.logger.log(`Updated Project: SERVICE: ${result}`);

    return result;
  }
}
