import { IsEnum, IsMongoId, IsNotEmpty, IsOptional } from "class-validator";
import { TicketQAStatus } from "src/common/enums/ticket.enum";


export class UpdateTicketQaStatusDto {

    @IsNotEmpty()
    @IsEnum(TicketQAStatus)
    qaStatus: TicketQAStatus;

    @IsOptional()
    @IsMongoId()
    updatedBy?: string
}