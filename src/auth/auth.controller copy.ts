// src/auth/auth.controller.ts
import { Controller, Post, Body, Req, UseGuards, HttpStatus, Ip } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    const data = await this.usersService.create(dto, { id: null, email: dto.email });
    return {
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully',
      data,
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req, @Ip() ip: string) {
    // La IP se pasa al servicio de login
    const data = await this.authService.login(req.user, ip);
    return {
      statusCode: HttpStatus.OK,
      message: 'Login successful',
      data,
    };
  }
}