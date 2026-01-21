import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  referralId: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: [String], default: [] })
  recipients: string[]; // user IDs

  @Prop({ default: false })
  read: boolean; // For dashboard "unread" badge

  // Optional: hydrate timestamps
  createdAt?: Date;
  updatedAt?: Date;

  // Optional: MongoDB ObjectId
  _id?: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
