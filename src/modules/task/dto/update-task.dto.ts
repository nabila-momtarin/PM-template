import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  MinLength,
  IsInt,
  Min,
  IsArray,
} from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // @IsOptional()
  // @IsEnum(TaskStatus)
  // status?: string;

  @IsOptional()
  @IsMongoId()
  assignee?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedTime?: number;

  @IsOptional()
  @Transform(({ value }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [value]; // fallback: single string, wrap in array
    }
  }
  return value;
})
  @IsArray()
  @IsString({ each: true })
  removeAttachments?: string[];

  //   @IsOptional()
  //   @IsArray()
  //   @IsString({ each: true })
  //   attachments?: string[];
}
