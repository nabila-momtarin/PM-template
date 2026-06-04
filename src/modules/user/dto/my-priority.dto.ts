import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

/**
 * Shared query DTO for both my-priority-tasks and my-priority-tickets.
 * No body — everything comes via query params.
 */
export class MyPriorityQueryDto extends PaginationQueryDto {

  @IsOptional()
  @IsString()
  search?: string;


  @IsOptional()
  @IsMongoId()
  projectId?: string;

  /** Filter by a specific task (my-priority-tasks only) */
  @IsOptional()
  @IsMongoId()
  taskId?: string;

  /** Filter by a specific ticket (my-priority-tickets only) */
  @IsOptional()
  @IsMongoId()
  ticketId?: string;
}