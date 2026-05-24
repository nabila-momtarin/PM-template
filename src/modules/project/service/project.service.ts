import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from '../repositroy/project.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectQueryDto } from '../dto/getAll-project.dto';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { Types } from 'mongoose';


@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) { }

  private readonly logger = new Logger(ProjectService.name);

  async create(createProjectDto: CreateProjectDto, currentUser: AuthenticatedUser) /* : Promise<ProjectDocument>  */ {
    this.logger.debug('..');

    try {
      const newProject = await this.projectRepository.createOne({
        ...createProjectDto,
        createdBy: new Types.ObjectId(currentUser.userId),
      });

      // console.log('newProject: SERVICE: ', newProject);
      this.logger.debug(`Created Project: SERVICE: ${newProject}`);

      return {
        success: true,
        message: 'Project created successfully',
        data: newProject,
      };
    } catch (err) {
      this.logger.error('ProjectService.create failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }


  async findAll(query: ProjectQueryDto) {
    this.logger.debug('..');

    try {
      this.logger.debug(`Query: SERVICE: ${query}`);

      const projects = await this.projectRepository.getAllData({
        filter: query.filter ?? '{}',
        // filter: this.buildProjectFilter(query),
        sortStr: query.sort ?? '-createdAt',
        page: String(query.page ?? 1),
        length: String(query.limit ?? query.length ?? 10),
        filterableFields: ['type', 'title']

      });

      // console.log("projects: SERVICE: ", projects);
      this.logger.debug(`Projects: SERVICE: ${projects}`);

      return {
        success: true,
        message: 'Projects fetched successfully',
        data: projects.data,
        pagination: projects.pagination
      };
    } catch (err) {
      this.logger.error('ProjectService.findAll failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  // private buildProjectFilter(query: ProjectQueryDto):string {
  //   if( query.filter){
  //     return query.filter;
  //   }

  //   const and: Record<string, unknown> = {};

  //   if (query.type) {
  //     and.type__eq = query.type;
  //   }

  //   if(query.search?.trim()) {
  //     and.title__like = query.search.trim();
  //   }

  //   return Object.keys(and).length > 0 ? JSON.stringify({ and }) : '{}';
  // }

  async getProjectById(projectId: string) {
    // console.log('Project SERVICE: getProjectById\n');
    this.logger.debug('..');

    try {
      const project = await this.projectRepository.findById({
        id: projectId
      });

      if (!project) {
        this.logger.error('Project Not Found');
        throw new NotFoundException('Project not found');
      }
      // console.log("project: SERVICE: ", project);
      this.logger.debug(`Fetched Project: SERVICE: ${project}`);

      return {
        success: true,
        message: 'Project fetched successfully',
        data: project,
      };
    } catch (err) {
      this.logger.error('ProjectService.getProjectById failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }


  async deleteByIdProject(projectId: string, currentUser: AuthenticatedUser) {
    // console.log('Project SERVICE: deleteByIdProject\n');
    this.logger.debug('..');

    try {
      // const projectToDelete = await this.projectRepository.deleteById(projectId);

      const deletedProject = await this.projectRepository.softDeleteById(
        projectId,
        { useLean: true },
        {
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(currentUser.userId),
        },
      );

      if (!deletedProject) {
        // console.log('Project Not Found');
        this.logger.error('Project Not Found');
        throw new NotFoundException('Project not found');
      }

      // console.log("Deleted Proejct : SERVICE: ", projectToDelete);
      this.logger.debug(`Deleted Project: SERVICE: ${deletedProject}`);

      return {
        success: true,
        message: 'Project deleted successfully',
        data: {
          id: projectId,
          title: deletedProject.title
        }

      };
    } catch (err) {
      this.logger.error('ProjectService.deleteByIdProject failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

  async updateProject(projectId: string, updateProjectDto: UpdateProjectDto) {

    this.logger.debug('..');

    try {
      // console.log("updateProjectDto: SERVICE: ", updateProjectDto);
      this.logger.log(`Update Project DTO: SERVICE: ${updateProjectDto}`);

      // if(!updateProjectDto) {
      //   console.log('No updates provided');
      //   throw new NotFoundException('No updates provided');
      // }

      const updatedProject = await this.projectRepository.updateByID(
        projectId,
        updateProjectDto
      );

      if (!updatedProject) {
        // console.log('Project Not Found');
        this.logger.error('Project Not Found');
        throw new NotFoundException('Project not found');
      }

      // console.log("updatedProject: SERVICE : ", updatedProject);
      this.logger.debug(`Updated Project: SERVICE: ${updatedProject}`);

      return {
        success: true,
        message: 'Project updated successfully',
        data: updatedProject,
      }
    } catch (err) {
      this.logger.error('ProjectService.updateProject failed', err instanceof Error ? err.stack : err);
      throw err;
    }
  }

}
