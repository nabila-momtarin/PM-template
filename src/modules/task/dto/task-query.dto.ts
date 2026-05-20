import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import { TaskStatus } from "src/common/enums/task.enum";
import { TicketPriority } from "src/common/enums/ticket.enum";


export class TaskQueryDto extends PaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;

    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsEnum(TicketPriority)
    priority?: TicketPriority;

    @IsOptional()
    @IsMongoId()
    assignee?: string;

    @IsOptional()
    @IsMongoId()
    projectId?: string;

    @IsOptional()
    @IsMongoId()
    ticketId?: string;

    @IsOptional()
    @IsString()
    search?: string;
}