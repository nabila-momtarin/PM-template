import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { TicketPriority, TicketStatus, TicketType } from 'src/common/enums/ticket.enum';
import { Type } from 'class-transformer';

export class TicketQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  // @IsOptional()
  // @IsString()
  // search?: string;

   @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ticketNumber?: number;
}
