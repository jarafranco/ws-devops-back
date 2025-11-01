import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true }) email: string;
  @Prop({ required: true }) password: string;
  @Prop({ default: 'user' }) role: string; // user | admin
  @Prop() lastLoginAt?: Date;
  @Prop() lastLoginIp?: string;
  @Prop({ default: false }) deleted: boolean;
  @Prop() modifiedBy?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
