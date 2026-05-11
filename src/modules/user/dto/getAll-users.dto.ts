import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";


export class UsersQueryDto extends PaginationQueryDto {
     @IsOptional()
      @Type(() => Number)
      @IsInt()
      @Min(1)
      limit?: number;
}