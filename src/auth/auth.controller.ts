// src/auth/auth.controller.ts
import { Controller, Post, Body, Req, UseGuards, HttpStatus, Ip, Get, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { Response } from 'express';

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

  // ✅ NUEVA RUTA: Verificar token
  @UseGuards(JwtAuthGuard)
  @Get('verify-token')
  async verifyToken(@Req() req, @Res() res: Response) {
    try {
      // Si el JwtAuthGuard pasa, el token es válido
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'Token válido',
        valid: true,
        user: {
          userId: req.user.userId,
          email: req.user.email,
          name: req.user.name,
          surname: req.user.surname,
          role: req.user.role
        }
      });
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Token inválido o expirado',
        valid: false
      });
    }
  }
}