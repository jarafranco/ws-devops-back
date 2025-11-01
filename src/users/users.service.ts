import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { Audit, AuditDocument } from './schemas/audit.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Audit.name) private auditModel: Model<AuditDocument>,
  ) {}

  // Create user (self-register or admin)
  async create(dto: CreateUserDto, actor?: { id?: string; email?: string }) {
    const exists = await this.userModel.findOne({ email: dto.email.toLowerCase() }).exec();
    if (exists) throw new BadRequestException('Email already registered');
    const salt = parseInt(process.env.SALT_ROUNDS || '10', 10);
    const password = await bcrypt.hash(dto.password, salt);
    const saved = await new this.userModel({ ...dto, password }).save();

    await this.auditModel.create({
      action: 'create',
      actorId: actor?.id,
      actorEmail: actor?.email,
      targetUserId: saved._id.toString(),
      targetRole: saved.role,
      changes: { after: { name: saved.name, email: saved.email, role: saved.role } },
    });

    const obj = saved.toObject();
    delete obj.password;
    return obj;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findAll() {
    // Se elimina el filtro { deleted: false } para que devuelva todos los usuarios.
    return this.userModel.find({}).select('-password').exec();
  }

  async findOne(id: string) {
    // No encontrar usuarios que estén marcados como borrados.
    const user = await this.userModel.findOne({ _id: id, deleted: false }).select('-password').exec();
    // Si el usuario no se encuentra (o está borrado), lanzamos la misma excepción.
    if (!user) throw new NotFoundException('User not found'); 
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor?: { id?: string; email?: string }) {
    const userBefore = await this.userModel.findById(id).lean().exec();
    if (!userBefore) throw new NotFoundException('User not found');

    const updateData: Partial<User> = { ...dto, modifiedBy: actor?.id };

    if (dto.password) {
      const salt = parseInt(process.env.SALT_ROUNDS || '10', 10);
      updateData.password = await bcrypt.hash(dto.password, salt);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).exec();

    if (!updatedUser) throw new NotFoundException('User not found during update');

    await this.auditModel.create({
      action: 'update',
      actorId: actor?.id,
      actorEmail: actor?.email,
      targetUserId: updatedUser._id.toString(),
      targetRole: updatedUser.role,
      changes: { before: { name: userBefore.name, email: userBefore.email, role: userBefore.role }, after: { name: updatedUser.name, email: updatedUser.email, role: updatedUser.role } },
    });

    const obj = updatedUser.toObject();
    delete obj.password;
    return obj;
  }

  async softDelete(id: string, actor?: { id?: string; email?: string }) {
    const userBefore = await this.userModel.findById(id).lean().exec();
    if (!userBefore) throw new NotFoundException('User not found');

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { deleted: true, modifiedBy: actor?.id } },
      { new: true }, // Devuelve el documento actualizado
    ).exec();

    if (!updatedUser) throw new NotFoundException('User not found during update');

    await this.auditModel.create({
      action: 'delete',
      actorId: actor?.id,
      actorEmail: actor?.email,
      targetUserId: updatedUser._id.toString(),
      targetRole: updatedUser.role,
      changes: { before: { name: userBefore.name, email: userBefore.email, role: userBefore.role }, after: { deleted: true } },
    });

    return { success: true };
  }

  // NUEVO MÉTODO: Encontrar solo usuarios borrados
  async findAllDeleted() {
    return this.userModel.find({ deleted: true }).select('-password').exec();
  }

  // NUEVO MÉTODO: Encontrar solo usuarios bloqueados
  async findAllBlocked() {
    return this.userModel.find({ isBlocked: true }).select('-password').exec();
  }

  // NUEVO MÉTODO: Restaurar un usuario borrado
  async restore(id: string, actor?: { id?: string; email?: string }) {
    const userBefore = await this.userModel.findOne({ _id: id, deleted: true }).lean().exec();
    if (!userBefore) throw new NotFoundException('Deleted user not found');

    const restoredUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { deleted: false, modifiedBy: actor?.id } },
      { new: true },
    ).exec();

    if (!restoredUser) throw new NotFoundException('User not found during restore');

    await this.auditModel.create({
      action: 'restore',
      actorId: actor?.id,
      actorEmail: actor?.email,
      targetUserId: restoredUser._id.toString(),
      targetRole: restoredUser.role,
      changes: { before: { deleted: true }, after: { deleted: false } },
    });

    const obj = restoredUser.toObject();
    delete obj.password;
    return obj;
  }

  // NUEVO MÉTODO: Bloquear un usuario
  async block(id: string, actor?: { id?: string; email?: string }) {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { isBlocked: true, modifiedBy: actor?.id } },
      { new: true },
    ).exec();

    if (!updatedUser) throw new NotFoundException('User not found');

    await this.auditModel.create({
      action: 'block',
      actorId: actor?.id,
      actorEmail: actor?.email,
      targetUserId: updatedUser._id.toString(),
      note: `User ${updatedUser.email} blocked.`,
    });

    return { success: true, isBlocked: updatedUser.isBlocked };
  }

  // NUEVO MÉTODO: Desbloquear un usuario
  async unblock(id: string, actor?: { id?: string; email?: string }) {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { isBlocked: false, modifiedBy: actor?.id } },
      { new: true },
    ).exec();

    if (!updatedUser) throw new NotFoundException('User not found');

    await this.auditModel.create({
      action: 'unblock',
      actorId: actor?.id,
      actorEmail: actor?.email,
      targetUserId: updatedUser._id.toString(),
      note: `User ${updatedUser.email} unblocked.`,
    });

    return { success: true, isBlocked: updatedUser.isBlocked };
  }

  async recordLogin(userId: string, ip?: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    await user.save();

    await this.auditModel.create({
      action: 'login',
      actorId: userId,
      actorEmail: user.email,
      targetUserId: userId,
      note: `Login from ${ip}`,
    });

    const obj = user.toObject();
    delete obj.password;
    return obj;
  }

  // Stats helpers
  async countTotal() {
    return this.userModel.countDocuments({ deleted: false }).exec();
  }

  async countBlocked() {
    return this.userModel.countDocuments({ isBlocked: true }).exec();
  }

  async countCreatedSince(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.userModel.countDocuments({ createdAt: { $gte: since } }).exec();
  }

  async countActiveSince(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.userModel.countDocuments({ lastLoginAt: { $gte: since } }).exec();
  }

  async countDeleted() {
    return this.userModel.countDocuments({ deleted: true }).exec();
  }

  async countModifiedSince(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.userModel.countDocuments({ updatedAt: { $gte: since } }).exec();
  }

  async findAdminModifications(limit = 50) {
    return this.auditModel
      .find({ action: { $in: ['update', 'delete'] }, targetRole: 'admin' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
