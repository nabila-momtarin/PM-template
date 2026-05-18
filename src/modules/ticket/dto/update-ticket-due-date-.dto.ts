import { Type } from "class-transformer";
import { IsMongoId, IsNotEmpty, IsOptional } from "class-validator";

export class UpdateTickeDueDatetDto {
    
    @IsNotEmpty()
    @Type(() => Date)
    dueDate: Date

    @IsOptional()
    @IsMongoId()
    updatedBy?: string
}