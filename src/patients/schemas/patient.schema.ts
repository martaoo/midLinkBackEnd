// src/patients/schemas/patient.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  sex: 'Male' | 'Female';

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop()
  nationalId?: string; // optional digital ID

  @Prop({ required: true })
  phone: string;

  @Prop()
  address?: string;

  // Ownership & audit
  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true })
  createdAtHospital: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
