import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from './project.repository';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';


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


  async findAll() {
    console.log('Project SERVICE: findAll\n');

    const projects = await this.projectRepository.find();
    
    console.log("projects: SERVICE: ", projects);

    return {
      success: true,
      message: 'Project fetched successfully',
      data: projects,
    }; 

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

      console.log("updatedProject: SERVICE : ", updatedProject);

      if(!updatedProject) {
        console.log('Project Not Found');
        throw new NotFoundException('Project not found');
      }

      return {
        success: true,
        message: 'Project updated successfully',
        data: updatedProject,
      }

    }
    
  }
