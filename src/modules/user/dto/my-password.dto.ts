import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

// const trimValue = ({ value }: { value: unknown }) =>
//   typeof value === 'string' ? value.trim() : value;

export class ChangePasswordDto {

//   @Transform(trimValue)
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


//   @Transform(trimValue)
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


//   @Transform(trimValue)
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
