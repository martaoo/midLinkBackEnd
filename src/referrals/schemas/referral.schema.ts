import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ReferralStatus, UrgencyLevel } from 'src/common/enums/referral-status.enum';

export type ReferralDocument = HydratedDocument<Referral>;

@Schema({ timestamps: true })
export class Referral {
  // ─────────────────────────────────────────
  // IDENTIFICATION
  // ─────────────────────────────────────────
  @Prop({ unique: true, required: true })
  referralCode: string;

  // ─────────────────────────────────────────
  // PARTICIPANTS
  // ─────────────────────────────────────────
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Hospital', required: true })
  fromHospital: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Hospital', required:false })
  toHospital: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  assignedSpecialist?: string;

  // ─────────────────────────────────────────
  // PATIENT (PUBLIC DATA)
  // ─────────────────────────────────────────
  @Prop({ required: true })
  patientName: string;

  @Prop({ required: true })
  patientPhone: string;

  @Prop({ enum: UrgencyLevel, required: true })
  urgency: UrgencyLevel;

  // ─────────────────────────────────────────
  // CLINICAL DATA (PROTECTED)
  // ─────────────────────────────────────────
  @Prop({ required: true })
  reasonForReferral: string;

  @Prop()
  clinicalNotes?: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  // ─────────────────────────────────────────
  // SECURITY & ACCESS CONTROL
  // ─────────────────────────────────────────
  @Prop({ required: false }) // optional so it can be nullified
  otpHash?: string;

  @Prop({ type: Date })
  otpExpiresAt?: Date;

  @Prop({ default: 0 })
  otpAttempts: number;

  @Prop({ default: false })
  isUnlocked: boolean;

  // ─────────────────────────────────────────
  // EXPIRY & GATEKEEPER
  // ─────────────────────────────────────────
  @Prop()
  expiresAt?: Date;

  @Prop()
  expiredAt?: Date;

  @Prop()
  gateCheckedInAt?: Date;

  // ─────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────
  @Prop({ enum: ReferralStatus, default: ReferralStatus.DRAFT })
  status: ReferralStatus;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  completedAt?: Date;
@Prop({ type: String }) // or use an Enum if departments are fixed
targetDepartment: string;
  // ─────────────────────────────────────────
  // DECISION METADATA (Receiving Hospital)
  // ─────────────────────────────────────────
  @Prop({
    type: {
      responderId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      justification: String,
      appointmentDate: Date,
    },
  })
  decisionMeta?: {
    responderId?: string;
    justification?: string;
    appointmentDate?: Date;
  };

  // ─────────────────────────────────────────
  // AUDIT LOG (LEGAL TRACEABILITY)
  // ─────────────────────────────────────────
  @Prop({
    type: [
      {
        status: { type: String, enum: ReferralStatus },
        actor: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    default: [],
  })
  activityLog: {
    status: ReferralStatus;
    actor: string;
    timestamp: Date;
    note?: string;
  }[];
  @Prop({ required: true, type: Types.ObjectId, ref: 'Patient' })
  patientId: Types.ObjectId;
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);

// Optional index for fast expiry checks
ReferralSchema.index({ expiresAt: 1 });
