import { Exclude, Transform } from "class-transformer";
import { MinLength, MaxLength, IsNotEmpty, IsString, IsEmail, IsStrongPassword, IsMongoId, IsOptional, Matches, IsUrl } from "class-validator";

export class CreateUserDto {

    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    )
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    /*    @IsUnique({
           field: 'email',
           where: { isDeleted: false },
           message: 'Email must be unique'
       }) */
    email: string;

    @IsNotEmpty()
    @IsString()
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 0,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })
    // @Exclude({ toPlainOnly: true })
    password: string;

    @IsNotEmpty()
    @IsString()
    @IsMongoId()
    role: string;

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
}