// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  surname: string;

  @Prop({ required: true, min: 0 })
  age: number;

  @Prop({ type: Date, required: true })
  birthDate: Date;

  @Prop({ unique: true, required: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: ['user', 'admin', 'super-admin', 'basic'], default: 'user' })
  role: string;

  @Prop({ default: false })
  deleted: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop() lastLoginAt?: Date;
  @Prop() lastLoginIp?: string;
  @Prop() modifiedBy?: string;

  // Campos para protección contra fuerza bruta
  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop()
  lockoutUntil?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);