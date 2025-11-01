import { IsEmail, IsOptional, MinLength, IsIn, IsInt, Min, IsDateString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() name?: string;

  @IsOptional() surname?: string;

  @IsOptional() @IsInt() @Min(0) age?: number;

  @IsOptional() @IsDateString() birthDate?: Date;

  @IsOptional() @IsEmail() email?: string;

  @IsOptional() @MinLength(6) password?: string;

  @IsOptional() @IsIn(['user', 'admin', 'super-admin', 'basic'])
  role?: string;
}
