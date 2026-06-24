
import { IsNotEmpty, IsString, IsStrongPassword } from "class-validator";


export class ChangePasswordDto {
    @IsNotEmpty()
    @IsString()
    // @IsStrongPassword({
    //     minLength: 8,
    //     minLowercase: 0,
    //     minUppercase: 1,
    //     minNumbers: 1,
    //     minSymbols: 1,
    // })
    currentPassword: string;


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
    @IsStrongPassword({
        minLength: 8,
        minLowercase: 0,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    })
    confirmPassword: string;
}