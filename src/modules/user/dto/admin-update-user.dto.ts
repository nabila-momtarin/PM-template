import { Transform } from "class-transformer";
import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from "class-validator";
import { Types } from "mongoose";


export class UpdateUserDto {

    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsNotEmpty()
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

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

    @Transform(({ value }) => {
        if (typeof value !== 'string') return value;

        const trimmedValue = value.trim();

        return trimmedValue === '' ? undefined : trimmedValue;
    })
    @IsOptional()
    @IsString()
    @IsUrl(
        {
            protocols: ['http', 'https'],
            require_protocol: true,
        },
        { message: 'Photo must be a valid URL' },
    )
    photo?: string;

    @IsOptional()
    @IsString()
    @IsMongoId()
    role?: Types.ObjectId;
}