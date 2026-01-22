import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Referral, ReferralDocument } from './schemas/referral.schema';
import {
  CreateReferralDto,
  RespondReferralDto,
  UnlockReferralDto,
  GateCheckInDto,
} from './dto/referralDto.dto';

import { ReferralStatus } from 'src/common/enums/referral-status.enum';
import { NotificationService } from './notification.service';
import { PatientsService } from 'src/patients/patients.service';
import { Hospital, HospitalDocument } from 'src/hospitals/schemas/hospital.schema';

@Injectable()
export class ReferralsService {
 constructor(
  @InjectModel(Referral.name)
  private readonly referralModel: Model<ReferralDocument>,

  @InjectModel(Hospital.name)
  private readonly hospitalModel: Model<HospitalDocument>,

  private readonly notificationService: NotificationService,
  private readonly patientService: PatientsService,
) {}


  // 1. CREATE REFERRAL (Doctor → DRAFT)
  // 1. CREATE REFERRAL (Doctor → DRAFT)
async createReferral(dto: CreateReferralDto, doctorId: string): Promise<Referral> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // ────── FIX: Destructure to remove 'patient' object from 'dto' ──────
  const { patient: patientData, ...referralData } = dto;

  // ────── HANDLE PATIENT ──────
  let patient: any;
  if (dto.patientId) {
    patient = await this.patientService.findById(dto.patientId);
    if (!patient) throw new BadRequestException('Invalid patient');
  } else if (patientData) {
    // PASS doctorId HERE so the patient document gets its 'createdBy'
    patient = await this.patientService.findOrCreate(patientData, dto.fromHospital, doctorId);
    if (!patient) throw new BadRequestException('Failed to create patient');
  } else {
    throw new BadRequestException('Patient information is required');
  }

  // ────── CREATE REFERRAL ──────
  const referral = await this.referralModel.create({
    ...referralData, // Use cleaned referralData instead of full dto
    patientId: new Types.ObjectId(patient._id),
    referralCode: `REF-${Date.now()}`,
    createdBy: doctorId,
    status: ReferralStatus.DRAFT,
    otpHash: await bcrypt.hash(otp, 10),
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    otpAttempts: 0,
    activityLog: [
      {
        status: ReferralStatus.DRAFT,
        actor: doctorId,
        note: 'Referral drafted by doctor',
        timestamp: new Date(),
      },
    ],
  });

  // LOG THE OTP for testing purposes
  console.log(`TESTING OTP for ${referral.referralCode}: ${otp}`);

  await this.notificationService.notifyReferralCreated(
    referral._id.toString(),
    dto.doctorName,
    [doctorId],
  );

  return referral;
}
// Inside ReferralsService
async attachFile(referralId: string, filePath: string,uploaderHospitalId: string) {
  const referral = await this.referralModel.findById(referralId);
  if (!referral) throw new NotFoundException('Referral not found');

  // Push the new file path into the attachments array
  return await this.referralModel.findByIdAndUpdate(
    referralId,
    { $push: { attachments: filePath } },
    { new: true }
  );
}
  // 2. FINALIZE & SEND (Liaison Officer)
  async finalizeAndSend(
  referralId: string,
  liaisonId: string,
  liaisonHospitalId: string,
  targetHospitalId: string,
  liaisonName: string,
): Promise<Referral> {
  const referral = await this.referralModel.findById(referralId);
  if (!referral) throw new NotFoundException('Referral not found');

  // Ownership check
  if (referral.fromHospital.toString() !== liaisonHospitalId.toString()) {
    throw new ForbiddenException(
      'You are not allowed to send referrals from another hospital',
    );
  }

  // Prevent self-referral
  if (liaisonHospitalId === targetHospitalId) {
    throw new BadRequestException(
      'Target hospital cannot be the same as the originating hospital',
    );
  }

  if (referral.status !== ReferralStatus.DRAFT) {
    throw new BadRequestException('Referral already finalized');
  }

  if (referral.toHospital) {
    throw new BadRequestException('Target hospital already assigned');
  }

  const targetHospital = await this.hospitalModel.findById(targetHospitalId);
  if (!targetHospital) {
    throw new NotFoundException('Target hospital does not exist');
  }

 referral.toHospital = targetHospitalId;

  referral.status = ReferralStatus.PENDING;
  referral.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  referral.activityLog.push({
    status: ReferralStatus.PENDING,
    actor: liaisonId,
    note: `Referral dispatched to ${targetHospital.name} by ${liaisonName}`,
    timestamp: new Date(),
  });

  const saved = await referral.save();

  await this.notificationService.notifyReferralSent(
  saved._id.toString(),
  targetHospital.name,
  [targetHospitalId], // recipients
);

  return saved;
}


  // 3. RESPOND TO REFERRAL
  async respondToReferral(
  referralId: string,
  dto: RespondReferralDto,
  responderId: string,
  responderHospitalId: string, // Added this for security!
): Promise<Referral> {
  const session: ClientSession = await this.referralModel.db.startSession();
  session.startTransaction();

  try {
    // 1. Fetch Referral and include Hospital details
    const referral = await this.referralModel.findById(referralId).session(session);
    if (!referral) throw new NotFoundException('Referral not found');

    // SECURITY: Ensure the responder belongs to the TARGET hospital
    if (referral.toHospital.toString() !== responderHospitalId.toString()) {
      throw new ForbiddenException('Your hospital is not authorized to respond to this referral');
    }

    if (referral.status !== ReferralStatus.PENDING)
      throw new BadRequestException('Referral already processed');

    if (dto.status !== ReferralStatus.ACCEPTED && !dto.justification)
      throw new BadRequestException('Justification is required for rejections/holds');

    // 2. Handle Acceptance & OTP
    if (dto.status === ReferralStatus.ACCEPTED) {
      const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      referral.otpHash = await bcrypt.hash(rawOtp, 10);
      referral.otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h validity
      referral.acceptedAt = new Date();

      // Fetch patient to get phone and target hospital to get name
      const [patient, targetHospital] = await Promise.all([
        this.patientService.findById(referral.patientId.toString()),
        this.hospitalModel.findById(referral.toHospital)
      ]);

      if (patient && targetHospital) {
        await this.notificationService.sendOtpToPatient(
          patient.phone, 
          rawOtp, 
          targetHospital.name
        );
      }
    }

    // 3. Update Status and Decision Metadata
    referral.status = dto.status;
    referral.decisionMeta = {
      responderId,
      justification: dto.justification,
      appointmentDate: dto.appointmentDate ? new Date(dto.appointmentDate) : undefined,
    };

    referral.activityLog.push({
      status: dto.status,
      actor: responderId,
      note: `Decision (${dto.status}) recorded by receiving hospital`,
      timestamp: new Date(),
    });

    const saved = await referral.save({ session });
    await session.commitTransaction();

    // 4. Notify the Originating Doctor
    await this.notificationService.notifyReferralResponded(
      saved._id.toString(),
      dto.status,
      [referral.createdBy.toString()],
    );

    return saved;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// 5. GET INCOMING (Corrected to ensure only PENDING are seen)
async getIncomingReferrals(hospitalId: string): Promise<Referral[]> {
  return this.referralModel.find({
    toHospital: hospitalId, 
    status: ReferralStatus.PENDING 
  })
  .populate('fromHospital', 'name')
  .populate('createdBy', 'fullName')
  .sort({ createdAt: -1 });
}
  // 4. GATE CHECK-IN
  async gateCheckIn(dto: GateCheckInDto, gateOfficerId: string): Promise<Referral> {
    const referral = await this.referralModel.findOne({ referralCode: dto.referralCode });
    if (!referral) throw new NotFoundException('Referral not found');

    // If already checked in, return the existing document immediately
    if (referral.gateCheckedInAt) {
      return referral; 
    }

    if (
      referral.status !== ReferralStatus.ACCEPTED &&
      referral.status !== ReferralStatus.SCHEDULED
    )
      throw new BadRequestException('Referral not valid for entry');

    referral.gateCheckedInAt = new Date();
    referral.status = ReferralStatus.CHECKED_IN;

    referral.activityLog.push({
      status: ReferralStatus.CHECKED_IN,
      actor: gateOfficerId,
      note: 'Patient arrived at hospital gate',
      timestamp: new Date(),
    });

    const saved = await referral.save();

    // Wrap in try-catch so notification failures don't block the return
    try {
      await this.notificationService.notifyPatientArrived(
        saved._id.toString(),
        [referral.createdBy],
      );
    } catch (e) {
      console.error('Notification failed', e);
    }

    return saved;
}

  // 5. UNLOCK CLINICAL DATA
  async unlockReferral(dto: UnlockReferralDto, specialistId: string): Promise<Referral> {
    const referral = await this.referralModel.findOne({ referralCode: dto.referralCode });
    if (!referral) throw new NotFoundException('Referral not found');
    if (!referral.gateCheckedInAt)
      throw new BadRequestException('Patient has not checked in yet');
    if (referral.isUnlocked)
      throw new BadRequestException('Referral already unlocked');

    if (
      referral.status !== ReferralStatus.ACCEPTED &&
      referral.status !== ReferralStatus.CHECKED_IN
    )
      throw new BadRequestException('Referral not eligible for unlock');

    if (referral.otpExpiresAt && referral.otpExpiresAt.getTime() < Date.now())
      throw new ForbiddenException('OTP expired');

    if (referral.otpAttempts >= 3)
      throw new ForbiddenException('OTP locked');

    if (!referral.otpHash) throw new BadRequestException('OTP not set');

    const validOtp = await bcrypt.compare(dto.otp, referral.otpHash);
    if (!validOtp) {
      referral.otpAttempts += 1;
      await referral.save();
      throw new ForbiddenException('Invalid OTP');
    }

    referral.isUnlocked = true;
    referral.otpHash = undefined;
    referral.otpExpiresAt = undefined;
    referral.otpAttempts = 0;

    referral.activityLog.push({
      status: referral.status,
      actor: specialistId,
      note: 'Clinical data unlocked',
      timestamp: new Date(),
    });

    const saved = await referral.save();

    await this.notificationService.notifyClinicalDataUnlocked(
      saved._id.toString(),
      [referral.createdBy],
    );

    return saved;
  }

  // 6. SUBMIT FEEDBACK
  async submitFeedback(
    referralId: string,
    feedbackNote: string,
    specialistId: string,
  ): Promise<Referral> {
    const referral = await this.referralModel.findById(referralId);
    if (!referral) throw new NotFoundException('Referral not found');

    if (!referral.isUnlocked)
      throw new BadRequestException('Clinical data not unlocked');

    if (referral.status === ReferralStatus.COMPLETED)
      throw new BadRequestException('Feedback already submitted');

    referral.status = ReferralStatus.COMPLETED;
    referral.completedAt = new Date();

    referral.activityLog.push({
      status: ReferralStatus.COMPLETED,
      actor: specialistId,
      note: `Backward referral: ${feedbackNote}`,
      timestamp: new Date(),
    });

    const saved = await referral.save();

    await this.notificationService.notifyFeedbackSubmitted(
      saved._id.toString(),
      [referral.createdBy],
    );

    return saved;
  }

  // 7. AUTO-EXPIRE REFERRALS
  @Cron(CronExpression.EVERY_30_MINUTES)
  async expireReferrals(): Promise<void> {
    const now = new Date();

    await this.referralModel.updateMany(
      {
        status: { $in: [ReferralStatus.PENDING, ReferralStatus.ACCEPTED] },
        expiresAt: { $lt: now },
      },
      {
        $set: {
          status: ReferralStatus.EXPIRED,
          expiredAt: now,
        },
        $push: {
          activityLog: {
            status: ReferralStatus.EXPIRED,
            actor: 'SYSTEM',
            note: 'Referral expired automatically',
            timestamp: now,
          },
        },
      },
    );
  }

  // 8. GATE KEEPER VIEW
  async getGatePassInfo(referralCode: string): Promise<any> {
    const referral = await this.referralModel.findOne({ referralCode })
      .select('patientName patientPhoto status toHospital')
      .lean();

    if (!referral) throw new NotFoundException('Invalid Referral Code');

    return referral;
  }
  // 9. LIAISON OUTBOX (Drafts waiting to be sent)
async getDraftsByHospital(hospitalId: string): Promise<Referral[]> {
  return this.referralModel.find({
    fromHospital: hospitalId,
    status: ReferralStatus.DRAFT
  })
  .populate('patientId', 'name')
  .populate('createdBy', 'fullName')
  .sort({ createdAt: -1 });
}
}
