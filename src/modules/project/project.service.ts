import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from './project.repository';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/getAll-project.dto';


@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}
  async create(
    createProjectDto: CreateProjectDto /* , userId: string */,
  ) /* : Promise<ProjectDocument>  */ {
    console.log('Project SERVICE: create\n');

    const newProject = await this.projectRepository.createOne({
      ...createProjectDto,
      // createdBy: userId,
    });

    console.log('newProject: SERVICE: ', newProject);

    return {
      success: true,
      message: 'Project created successfully',
      data: newProject,
    };
  }


  async findAll( query : ProjectQueryDto) {
    console.log('Project SERVICE: findAll\n');

    // const filter =this.projectRepository.
    console.log("\n\nQuery: SERVICE: ", query);

    const projects = await this.projectRepository.getAllData({
      filter: this.buildProjectFilter(query),
      sortStr : query.sort ?? '-createdAt',
      page: String(query.page ?? 1),
      length: String(query.limit ?? query.length ??  10),
      filterableFields: ['type', 'title']

    });
    
    console.log("projects: SERVICE: ", projects);

    return {
      success: true,
      message: 'Project fetched successfully',
      data: projects.data,
      pagination: projects.pagination
    }; 
  }

  private buildProjectFilter(query: ProjectQueryDto):string {
    if( query.filter){
      return query.filter;
    }

    const and: Record<string, unknown> = {};

    if (query.type) {
      and.type__eq = query.type;
    }

    if(query.search?.trim()) {
      and.title__like = query.search.trim();
    }

    return Object.keys(and).length > 0 ? JSON.stringify({ and }) : '{}';
  }

  async getProjectById( projectId : string) {
    console.log('Project SERVICE: getProjectById\n');

    const project = await this.projectRepository.findById({
        id : projectId
    });
    
    if(!project) {
      throw new NotFoundException('Project not found');
    }
    console.log("project: SERVICE: ", project);

    return {
      success: true,
      message: 'Project fetched successfully',
      data: project,
    };
  }


  async deleteByIdProject (projectId: string) {
    console.log('Project SERVICE: deleteByIdProject\n');

    const projectToDelete = await this.projectRepository.deleteById( projectId );

    if(!projectToDelete) {
        console.log('Project Not Found');
      throw new NotFoundException('Project not found');
    }

    console.log("Deleted Proejct : SERVICE: ", projectToDelete);

    return {
        success: true,
        message: 'Project deleted successfully',
        data: {
            id : projectId,
            title : projectToDelete.title
        }
      
      };
    }

    async updateProject(projectId: string, updateProjectDto: UpdateProjectDto) {
      console.log('Project SERVICE: updateProject\n');

      console.log("updateProjectDto: SERVICE: ", updateProjectDto);

      // if(!updateProjectDto) {
      //   console.log('No updates provided');
      //   throw new NotFoundException('No updates provided');
      // }

      const updatedProject = await this.projectRepository.updateByID(
        projectId,
        updateProjectDto
      );


      if(!updatedProject) {
        console.log('Project Not Found');
        throw new NotFoundException('Project not found');
      }

            console.log("updatedProject: SERVICE : ", updatedProject);


      return {
        success: true,
        message: 'Project updated successfully',
        data: updatedProject,
      }

    }
    
  }
