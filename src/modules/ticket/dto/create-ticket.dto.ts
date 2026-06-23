import { Transform, Type } from 'class-transformer';
import {
  Allow,
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

  // @IsArray()
  // @IsOptional()
  // @IsUrl({}, { each: true })
  // attachments?: string[];

  @Allow()
  @IsOptional()
  attachments?: unknown;

  @Transform(({ value }) => {
  if (value === undefined || value === null) return value;
  return Array.isArray(value) ? value : [value];
})
  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  projects?: string[];
}
