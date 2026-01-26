import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsMongoId,
  IsPhoneNumber,
  Length,
  ValidateIf,
  IsDateString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { UrgencyLevel, ReferralStatus } from 'src/common/enums/referral-status.enum';
import { CreatePatientDto } from 'src/patients/dto/create-patient.dto';


// ─────────────────────────────────────────
// CREATE REFERRAL DTO
// ─────────────────────────────────────────
export class CreateReferralDto {
 // @IsMongoId()
  //@IsNotEmpty()
  //fromHospital: string;
 //@IsString()      // Add this
  //@IsNotEmpty()    // Add this
  //doctorName: string;

  @IsOptional()    // Add this
  @IsMongoId()     // Add this
  patientId?: string;
    @IsObject()
  @ValidateNested()
  @Type(() => CreatePatientDto)
  patient?: CreatePatientDto;

  @IsMongoId()
  @IsOptional()
  toHospital: string;

  @IsString()
  @IsNotEmpty()
  patientName: string;

  @IsPhoneNumber('ET')
  patientPhone: string;

  @IsEnum(UrgencyLevel)
  urgency: UrgencyLevel;

  @IsString()
  @IsNotEmpty()
  reasonForReferral: string;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  // Optional operational fields
  @IsOptional()
  @IsString()
  requiredSpecialty?: string;

  @IsOptional()
  @IsString()
  requiredBedType?: string;
}
export class SubmitFeedbackDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 2000) // Ensures the backward referral isn't too short
  feedbackNote: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  finalAttachments?: string[]; // Discharge summaries, lab results, etc.
}

// ─────────────────────────────────────────
// GATE CHECK-IN DTO
// ─────────────────────────────────────────
export class GateCheckInDto {
  @IsString()
  @IsNotEmpty()
  referralCode: string;
}


// ─────────────────────────────────────────
// RESPOND TO REFERRAL DTO
// ─────────────────────────────────────────
export class RespondReferralDto {
  @IsEnum(ReferralStatus)
  status: ReferralStatus;
  @IsOptional()
  @IsString()
  targetDepartment?: string;

  // LOGIC: If status is REJECTED, justification MUST be provided
  @ValidateIf(o => o.status === ReferralStatus.REJECTED)
  @IsNotEmpty({ message: 'A justification is required when rejecting a referral' })
  @IsString()
  justification?: string;

  @IsOptional()
  @IsDateString()
  appointmentDate?: string;
}


// ─────────────────────────────────────────
// UNLOCK REFERRAL DTO
// ─────────────────────────────────────────
export class UnlockReferralDto {
  @IsString()
  @IsNotEmpty()
  referralCode: string;

  @IsString()
  @Length(6, 6)
  @IsOptional()
  otp: string;
}
