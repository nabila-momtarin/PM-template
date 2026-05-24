import { Allow, IsArray, IsEnum, IsMongoId, IsOptional, IsString, IsUrl, MinLength } from "class-validator";
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


     @Allow()
     @IsOptional()
     attachments?: unknown;


    @IsOptional()
    @IsMongoId()
    updatedBy?: string
}