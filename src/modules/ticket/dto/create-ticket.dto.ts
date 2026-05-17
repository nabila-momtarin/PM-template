import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  TicketPriority,
  TicketType,
} from 'src/common/enums/ticket.enum';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  @IsUrl({}, { each: true })
  attachments?: string[];

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
  @IsMongoId({ each: true })
  projects?: string[];
}