import { IsEmail, IsNotEmpty, MinLength, IsIn, IsInt, Min, IsDateString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty() name: string;

  @IsNotEmpty() surname: string;

  @IsInt() @Min(0) age: number;

  // birthDate en formato ISO (yyyy-mm-dd)
  @IsDateString() birthDate: Date;

  @IsEmail() email: string;

  @MinLength(6) password: string;

  @IsIn(['user', 'admin', 'super-admin', 'basic'])
  role: string;
}
