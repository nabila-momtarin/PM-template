import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
// import { ProjectType } from "src/common/enums/project-type.enum";

export class UpdateProjectDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    // @IsOptional()
    // @IsEnum(ProjectType)
    // type?:string;
 
    @IsOptional()
    @IsString()
    repositoryURL?: string;
}