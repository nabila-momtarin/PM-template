import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsMongoId, IsDateString, MinLength, IsInt, IsUrl, Min, Allow } from 'class-validator';

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNotEmpty()
    @IsMongoId()
    projectId: string;

    @IsNotEmpty()
    @IsMongoId()
    ticketId: string;

    @IsNotEmpty()
    @IsMongoId()
    assignee: string;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    estimatedTime?: number;

    // @IsOptional()
    // @IsArray()
    // @IsUrl({}, { each: true })
    // attachments?: string[];

    // Important for multipart/form-data + ValidationPipe
  // We do NOT trust this value. Actual files come from @UploadedFiles().
  @Allow()
  @IsOptional()
  attachments?: unknown;
}
