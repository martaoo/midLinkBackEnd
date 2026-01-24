import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
// import * as bcrypt from 'bcrypt'; // OTP: Commented out for MVP
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
 // 1. UPDATE: Added hospitalId and doctorName as arguments
async createReferral(
  dto: CreateReferralDto, 
  doctorId: string, 
  hospitalId: string, 
  doctorName: string
): Promise<Referral> {

  // ────── FIX: Destructure to remove 'patient' object from 'dto' ──────
  const { patient: patientData, ...referralData } = dto;

  // ────── HANDLE PATIENT ──────
  let patient: any;
  if (dto.patientId) {
    patient = await this.patientService.findById(dto.patientId);
    if (!patient) throw new BadRequestException('Invalid patient');
  } else if (patientData) {
    // FIX: Changed dto.fromHospital to hospitalId (the argument we just added)
    patient = await this.patientService.findOrCreate(patientData, hospitalId, doctorId);
    if (!patient) throw new BadRequestException('Failed to create patient');
  } else {
    throw new BadRequestException('Patient information is required');
  }

  // ────── CREATE REFERRAL ──────
  const referral = await this.referralModel.create({
    ...referralData, 
    fromHospital: hospitalId, // FIX: Use the hospitalId from the arguments
    patientId: new Types.ObjectId(patient._id),
    referralCode: `REF-${Date.now()}`,
    createdBy: doctorId,
    status: ReferralStatus.DRAFT,
    activityLog: [
      {
        status: ReferralStatus.DRAFT,
        actor: doctorId,
        // Using the doctorName passed from the token for the log
        note: `Referral drafted by Dr. ${doctorName}`, 
        timestamp: new Date(),
      },
    ],
  });

  // ────── NOTIFICATION ──────
  await this.notificationService.notifyReferralCreated(
    referral._id.toString(),
    doctorName, // FIX: Use doctorName from arguments, not from dto
    [doctorId],
  );

  return referral;
}

  async attachFile(referralId: string, filePath: string, uploaderHospitalId: string) {
    const referral = await this.referralModel.findById(referralId);
    if (!referral) throw new NotFoundException('Referral not found');

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

    if (referral.fromHospital.toString() !== liaisonHospitalId.toString()) {
      throw new ForbiddenException('You are not allowed to send referrals from another hospital');
    }

    if (liaisonHospitalId === targetHospitalId) {
      throw new BadRequestException('Target hospital cannot be the same as the originating hospital');
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
      [targetHospitalId],
    );

    return saved;
  }

  // 3. RESPOND TO REFERRAL
  async respondToReferral(
    referralId: string,
    dto: RespondReferralDto,
    responderId: string,
    responderHospitalId: string,
  ): Promise<Referral> {
    const session: ClientSession = await this.referralModel.db.startSession();
    session.startTransaction();

    try {
      const referral = await this.referralModel.findById(referralId).session(session);
      if (!referral) throw new NotFoundException('Referral not found');

      if (referral.toHospital.toString() !== responderHospitalId.toString()) {
        throw new ForbiddenException('Your hospital is not authorized to respond to this referral');
      }

      if (referral.status !== ReferralStatus.PENDING)
        throw new BadRequestException('Referral already processed');

      if (dto.status !== ReferralStatus.ACCEPTED && !dto.justification)
        throw new BadRequestException('Justification is required for rejections/holds');

      if (dto.status === ReferralStatus.ACCEPTED) {
        // const rawOtp = Math.floor(100000 + Math.random() * 900000).toString(); // OTP: Commented out
        // referral.otpHash = await bcrypt.hash(rawOtp, 10); // OTP: Commented out
        // referral.otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // OTP: Commented out
        referral.acceptedAt = new Date();

        /* OTP: SMS logic commented out
        const [patient, targetHospital] = await Promise.all([
          this.patientService.findById(referral.patientId.toString()),
          this.hospitalModel.findById(referral.toHospital)
        ]);

        if (patient && targetHospital) {
          await this.notificationService.sendOtpToPatient(patient.phone, rawOtp, targetHospital.name);
        }
        */
      }

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

    try {
      await this.notificationService.notifyPatientArrived(
        saved._id.toString(),
        [referral.createdBy,referral.toHospital],
      );
    } catch (e) {
      console.error('Notification failed', e);
    }

    return saved;
  }

  // 5. UNLOCK CLINICAL DATA
  async unlockReferral(dto: UnlockReferralDto, specialistId: string, specialistHospitalId: string): Promise<Referral> {
    const referral = await this.referralModel.findOne({ referralCode: dto.referralCode });
    if (!referral) throw new NotFoundException('Referral not found');

    // SECURITY FIX: Ensure the specialist belongs to the destination hospital
    if (referral.toHospital.toString() !== specialistHospitalId.toString()) {
      throw new ForbiddenException('You are not authorized to unlock referrals for this hospital');
    }

    if (!referral.gateCheckedInAt)
      throw new BadRequestException('Patient has not checked in yet');
    
    if (referral.isUnlocked)
      throw new BadRequestException('Referral already unlocked');

    if (
      referral.status !== ReferralStatus.ACCEPTED &&
      referral.status !== ReferralStatus.CHECKED_IN
    )
      throw new BadRequestException('Referral not eligible for unlock');

    /* OTP: Comparison logic commented out
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
    */

    referral.isUnlocked = true;
    // referral.otpHash = undefined; // OTP: Commented out
    // referral.otpExpiresAt = undefined; // OTP: Commented out
    // referral.otpAttempts = 0; // OTP: Commented out

    referral.activityLog.push({
      status: referral.status,
      actor: specialistId,
      note: 'Clinical data unlocked by specialist',
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

  // 9. LIAISON OUTBOX
  async getDraftsByHospital(hospitalId: string): Promise<Referral[]> {
    return this.referralModel.find({
      fromHospital: hospitalId,
      status: ReferralStatus.DRAFT
    })
    .populate('patientId', 'name')
    .populate('createdBy', 'fullName')
    .sort({ createdAt: -1 });
  }
  // ... existing methods (unlockReferral, submitFeedback, etc.)

  // 10. SPECIALIST WORKLIST
  // This is what the Doctor/Specialist sees on their dashboard
  async getSpecialistQueue(hospitalId: string): Promise<Referral[]> {
    return this.referralModel.find({
      toHospital: hospitalId,
      // We show both 'ACCEPTED' (upcoming) and 'CHECKED_IN' (patient is here)
      status: { 
        $in: [ReferralStatus.ACCEPTED, ReferralStatus.CHECKED_IN] 
      }
    })
    .populate('patientId') // This pulls in the patient details (name, age, etc.)
    .populate('fromHospital', 'name') // Shows which hospital sent them
    .sort({ gateCheckedInAt: -1, createdAt: -1 }); // Show recently arrived patients first
  }
} // End of ReferralsService class
