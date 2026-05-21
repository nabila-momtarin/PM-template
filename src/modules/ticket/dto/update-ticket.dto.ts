import { IsArray, IsEnum, IsMongoId, IsOptional, IsString, IsUrl, MinLength } from "class-validator";
import { TicketPriority, TicketType } from "src/common/enums/ticket.enum";

export class UpdateTicketDto {

    @IsOptional()
    @IsString()
    @MinLength(3)
    title?: string;


    @IsOptional()
    @IsString()
    description?: string;


    @IsOptional()
    @IsEnum(TicketType)
    ticketType?: TicketType;


    @IsOptional()
    @IsEnum(TicketPriority)
    @IsString()
    priority?: TicketPriority;


    @IsOptional()
    @IsArray()
    projects?: string[];


    // @IsOptional()
    // @IsArray()
    // @IsUrl({}, { each: true })
    // attachments?: string[];


    @IsOptional()
    @IsMongoId()
    updatedBy?: string
}