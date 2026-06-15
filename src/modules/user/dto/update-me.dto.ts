import { Transform } from "class-transformer";
import { MinLength, MaxLength, IsNotEmpty, IsString, IsOptional, Matches, IsUrl } from "class-validator";


export class UpdateMeDto {
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(100)
    @IsOptional()
    name: string;


    @Transform(({ value }) => {
        if (typeof value !== 'string') return value;

        const trimmedValue = value.trim();

        return trimmedValue === '' ? undefined : trimmedValue;
    })
    @IsOptional()
    @IsString()
    @Matches(/^\+[1-9]\d{1,14}$/, {
        message: 'Phone number must be in E.164 format',
    })
    phoneNumber?: string;


    // @Transform(({ value }) => {
    //     if (typeof value !== 'string') return value;

    //     const trimmedValue = value.trim();

    //     return trimmedValue === '' ? undefined : trimmedValue;
    // })
    @IsOptional()
    @IsString()
    photo?: string;
}    