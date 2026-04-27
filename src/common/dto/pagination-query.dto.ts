import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Base pagination DTO — extend this in every "list" endpoint.
 *
 * Query params:
 *   page    – page number (default 1)
 *   length  – items per page (default 10, max 100)
 *   sort    – comma-separated sort string, e.g. "createdAt:desc,name:asc" or "-createdAt,+name"
 *   filter  – JSON filter string consumed by filterParamsDecoder, e.g.
 *             {"and":{"status__eq":"active","age__gte":18}}
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number (starts at 1)', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  length?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort field. Use "+field" for ascending, "-field" for descending. For multiple fields use JSON array: [\'+field1\', \'-field2\'].',
    example: '-createdAt',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'JSON filter object. See params-decoder.ts for supported operators.',
    example: '{"and":{"status__eq":"active"}}',
  })
  @IsOptional()
  @IsString()
  filter?: string;
}
