import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";

export class ResetPasswordDto {

    @IsNotEmpty()
    @IsString()
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 0,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })
    newPassword: string;

    @IsNotEmpty()
    @IsString()
    confirmPassword: string;
}