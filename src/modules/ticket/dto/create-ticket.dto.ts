import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { TicketPriority, TicketType } from 'src/common/enums/ticket.enum';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
//   @MaxLength(150)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
  
  @IsEnum(TicketType)
  @IsNotEmpty()
  ticketType: TicketType;

  @IsEnum(TicketPriority)
  @IsNotEmpty()
  priority: TicketPriority;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dueDate: Date;

  @IsArray()
  @IsOptional()
  @IsUrl({}, { each: true })
  attachments?: string[];

  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  projects?: string[];
}
