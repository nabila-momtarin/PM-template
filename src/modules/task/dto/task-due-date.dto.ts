import { Type } from "class-transformer";
import { IsMongoId, IsNotEmpty, IsOptional } from "class-validator";

export class TaskDueDateUpdateDTO {
    
    @IsNotEmpty()
    @Type(() => Date)
    dueDate: Date

}