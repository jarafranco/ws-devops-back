import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditDocument = Audit & Document;

@Schema({ timestamps: true })
export class Audit {
  @Prop({ required: true })
  action: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  actor?: Types.ObjectId;

  @Prop()
  actorEmail?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  targetUser?: Types.ObjectId;

  @Prop({ type: Object })
  changes?: any;

  @Prop()
  note?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);