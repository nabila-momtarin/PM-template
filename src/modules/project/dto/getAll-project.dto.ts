import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
// import { ProjectType } from 'src/common/enums/project-type.enum';

export class ProjectQueryDto extends PaginationQueryDto {
  // @IsOptional()
  // @IsEnum(ProjectType)
  // type?: ProjectType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
//   @Max(100)
  limit?: number;
}


// feat: implement project query functionality; enhance findAll method with filtering and pagination 
// feat: add logging for updated project in updateProject method; handle not found case