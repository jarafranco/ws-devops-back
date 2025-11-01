import { Injectable, UnauthorizedException, Logger, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { UserDocument } from '../users/schemas/user.schema';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    // Remover temporalmente AuditModel para testing
    // @InjectModel(Audit.name) private auditModel: Model<AuditDocument>,
  ) {}

  async validateUser(email: string, pass: string, ip: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logBruteForceAttempt(email, ip, 'User not found');
      throw new UnauthorizedException('User not found');
    }

    // Cast to UserDocument para acceder a las propiedades
    const userDoc = user as UserDocument;

    // >> NUEVA VERIFICACIÓN: No permitir login si el usuario está borrado.
    if (userDoc.deleted) {
      this.logger.warn(`Login attempt for deleted user: ${email}`);
      throw new UnauthorizedException('User is deleted');
    }

    // >> NUEVA VERIFICACIÓN: No permitir login si el usuario está bloqueado.
    if (userDoc.isBlocked) {
      this.logger.warn(`Login attempt for blocked user: ${email}`);
      // Cambiamos el mensaje para que el frontend pueda interpretarlo.
      throw new UnauthorizedException('User is blocked');
    }

    // Verificar si la cuenta está bloqueada
    if (userDoc.lockoutUntil && userDoc.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((userDoc.lockoutUntil.getTime() - new Date().getTime()) / 60000);
      this.logBruteForceAttempt(email, ip, `Account locked. Try again in ${remainingTime} minutes.`);
      throw new ForbiddenException(`Account is locked. Please try again in ${remainingTime} minutes.`);
    }

    const isMatch = await bcrypt.compare(pass, userDoc.password);

    if (isMatch) {
      // Si el login es exitoso, reiniciar los intentos fallidos
      if (userDoc.failedLoginAttempts > 0) {
        userDoc.failedLoginAttempts = 0;
        userDoc.lockoutUntil = null;
        await userDoc.save();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = userDoc.toObject();
      return result;
    } else {
      // Incrementar intentos fallidos y bloquear si es necesario
      userDoc.failedLoginAttempts += 1;
      if (userDoc.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        userDoc.lockoutUntil = new Date(Date.now() + LOCKOUT_TIME_MINUTES * 60 * 1000);
        this.logBruteForceAttempt(email, ip, `Account locked for ${LOCKOUT_TIME_MINUTES} minutes due to too many failed attempts.`);
      } else {
        this.logBruteForceAttempt(email, ip, 'Invalid password');
      }
      await userDoc.save();
      throw new UnauthorizedException('Invalid credentials');
    }
  }

async login(user: any, ip: string) {
  await this.usersService.recordLogin(user._id, ip);
  
  // Incluir más datos del usuario en el payload
  const payload = { 
    email: user.email, 
    sub: user._id,
    name: user.name,
    surname: user.surname,
    age: user.age,
    role: user.role,
    createdAt: user.createdAt
  };
  
  return {
    access_token: this.jwtService.sign(payload),
  };
}
  private async logBruteForceAttempt(email: string, ip: string, reason: string) {
    const message = `Failed login attempt for email: ${email} from IP: ${ip}. Reason: ${reason}`;
    this.logger.warn(message);
    // Temporalmente solo log a consola
    // await this.auditModel.create({ action: 'brute-force-attempt', actorEmail: email, note: message });
  }
}