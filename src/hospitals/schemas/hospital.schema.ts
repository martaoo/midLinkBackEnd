import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  HospitalLevel,
  TrafficLightStatus,
  HospitalService,
  HospitalSpecialization,
} from '../../common/enums/hospital.enum';

export type HospitalDocument = HydratedDocument<Hospital>;

@Schema({ timestamps: true })
export class Hospital {
  // --- IDENTIFICATION ---
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  // --- LOCATION ---
  @Prop({ required: true })
  region: string;

  @Prop({ required: true })
  city: string;

  @Prop()
  woreda?: string;

  // --- HOSPITAL LEVEL ---
  @Prop({ required: true, enum: HospitalLevel })
  level: HospitalLevel;

  // --- DYNAMIC SERVICES ---
  @Prop({ type: [String], enum: HospitalService, default: [] })
  services: HospitalService[];

  // --- SPECIALIZATIONS ---
  @Prop({ type: [String], enum: HospitalSpecialization, default: [] })
  specializations: HospitalSpecialization[];

  // --- BED DETAILS ---
  @Prop({
    type: Map,
    of: {
      total: { type: Number, required: true ,min: 0,},
      available: { type: Number, required: true,min: 0, },
    },
    default: {},
  })
  bedCapacity: Record<string, { total: number; available: number }>;

  // --- EQUIPMENT ---
  @Prop({ default: false })
  hasMRI: boolean;

  @Prop({ default: false })
  hasCTScan: boolean;

  @Prop({ default: false })
  hasXRay: boolean;

  // --- STATUS ---
  @Prop({ enum: TrafficLightStatus, default: TrafficLightStatus.GREEN })
  trafficLightStatus: TrafficLightStatus;

  // --- SYSTEM STATUS ---
  @Prop({ default: true })
  isActive: boolean;

  // --- CONTACT ---
  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  // --- TRACK LAST UPDATE ---
  @Prop()
  lastStatusUpdate?: Date;

  @Prop()
  updatedBy?: string; // userId of last person who updated
}

export const HospitalSchema = SchemaFactory.createForClass(Hospital);
