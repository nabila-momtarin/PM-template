import { IsEnum, IsOptional, IsString } from "class-validator";
// import { ProjectType } from "src/common/enums/project-type.enum";


export class CreateProjectDto {
    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description: string;

    // @IsEnum(ProjectType)
    // type: ProjectType;
    
    @IsString()
    @IsOptional()
    repositoryURL: string;
}