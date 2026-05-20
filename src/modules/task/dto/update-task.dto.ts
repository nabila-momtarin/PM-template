import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsMongoId, MinLength, IsInt, IsUrl, Min, IsEnum } from 'class-validator';
import { TaskStatus } from 'src/common/enums/task.enum';


export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;
        
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: string;

    @IsOptional()
    @IsMongoId()
    assignee?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    estimatedTime?: number;


    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    attachments?: string[];
}