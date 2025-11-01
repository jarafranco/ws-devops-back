import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, HttpStatus, NotFoundException, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

/*   @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req) {
    const data = await this.usersService.findOne(req.user.userId);
    return {
      statusCode: HttpStatus.OK,
      message: 'User retrieved successfully',
      data,
    };
  }
 */

@UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req) {
    // Usar findOne en lugar de findById - verifica qué método existe en tu UsersService
    const user = await this.usersService.findOne(req.user.userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Devolver todos los datos del usuario (excepto password)
    const { password, ...userData } = user.toObject ? user.toObject() : user;
    
    return {
      statusCode: 200,
      message: 'User retrieved successfully',
      data: userData,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async findAll() {
    const data = await this.usersService.findAll();
    return {
      statusCode: HttpStatus.OK,
      message: 'Users retrieved successfully',
      data,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() dto: CreateUserDto, @Request() req) {
    // El actor es el administrador que está realizando la acción.
    const actor = { id: req.user.userId, email: req.user.email };
    const data = await this.usersService.create(dto, actor);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'User created successfully',
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req) {
    const actor = { id: req.user.userId, email: req.user.email };
    const data = await this.usersService.update(id, dto, actor);
    return {
      statusCode: HttpStatus.OK,
      message: 'User updated successfully',
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const actor = { id: req.user.userId, email: req.user.email };
    const data = await this.usersService.softDelete(id, actor);
    return {
      statusCode: HttpStatus.OK,
      message: 'User deleted successfully',
      data,
    };
  }

  // NUEVO ENDPOINT: Obtener usuarios borrados (solo para administradores)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('deleted')
  async findAllDeleted() {
    const data = await this.usersService.findAllDeleted();
    return {
      statusCode: HttpStatus.OK,
      message: 'Deleted users retrieved successfully',
      data,
    };
  }

  // NUEVO ENDPOINT: Obtener usuarios bloqueados (solo para administradores)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('blocked')
  async findAllBlocked() {
    const data = await this.usersService.findAllBlocked();
    return {
      statusCode: HttpStatus.OK,
      message: 'Blocked users retrieved successfully',
      data,
    };
  }


  // NUEVO ENDPOINT: Restaurar un usuario (solo para administradores)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/restore')
  async restore(@Param('id') id: string, @Request() req) {
    const actor = { id: req.user.userId, email: req.user.email };
    const data = await this.usersService.restore(id, actor);
    return {
      statusCode: HttpStatus.OK,
      message: 'User restored successfully',
      data,
    };
  }

  // NUEVO ENDPOINT: Bloquear un usuario (solo para administradores)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/block')
  async block(@Param('id') id: string, @Request() req) {
    const actor = { id: req.user.userId, email: req.user.email };
    const data = await this.usersService.block(id, actor);
    return {
      statusCode: HttpStatus.OK,
      message: 'User blocked successfully',
      data,
    };
  }

  // NUEVO ENDPOINT: Desbloquear un usuario (solo para administradores)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/unblock')
  async unblock(@Param('id') id: string, @Request() req) {
    const actor = { id: req.user.userId, email: req.user.email };
    const data = await this.usersService.unblock(id, actor);
    return {
      statusCode: HttpStatus.OK,
      message: 'User unblocked successfully',
      data,
    };
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('stats')
  async stats() {
    const data = {
      totalUsers: await this.usersService.countTotal(),
      createdLastWeek: await this.usersService.countCreatedSince(7),
      createdLastMonth: await this.usersService.countCreatedSince(30),
      activeLastWeek: await this.usersService.countActiveSince(7),
      activeLastMonth: await this.usersService.countActiveSince(30),
      deleted: await this.usersService.countDeleted(),
      blocked: await this.usersService.countBlocked(),
      modifiedLast30: await this.usersService.countModifiedSince(30),
      adminModifications: await this.usersService.findAdminModifications(50),
    };

    return {
      statusCode: HttpStatus.OK,
      message: 'Stats retrieved successfully',
      data,
    };
  }
}
