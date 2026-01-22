import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification,NotificationDocument } from './schemas/notfiationSchema.schema';

export type NotificationType =
  | 'REFERRAL_CREATED'
  | 'REFERRAL_SENT'
  | 'REFERRAL_RESPONDED'
  | 'PATIENT_ARRIVED'
  | 'CLINICAL_DATA_UNLOCKED'
  | 'FEEDBACK_SUBMITTED'
  | 'REFERRAL_EXPIRED';

export interface NotificationPayload {
  referralId: string;
  type: NotificationType;
  message: string;
  recipients?: string[]; // Optional user IDs or hospital IDs
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>
  ) {}

  /**
   * Save a notification to the database
   */
  async notify(payload: NotificationPayload) {
    const notification = await this.notificationModel.create(payload);

    this.logger.log(
      `Notification saved: [${payload.type}] Referral: ${payload.referralId} | Message: ${payload.message}`
    );

    return notification;
  }

  // Convenience methods for each type
  async notifyReferralCreated(referralId: string, doctorName: string, recipients: string[]) {
    return this.notify({
      referralId,
      type: 'REFERRAL_CREATED',
      message: `New referral created by Dr. ${doctorName}`,
      recipients,
    });
  }

  async notifyReferralSent(referralId: string, hospitalName: string, recipients: string[]) {
    return this.notify({
      referralId,
      type: 'REFERRAL_SENT',
      message: `Referral sent to ${hospitalName}`,
      recipients,
    });
  }

  async notifyReferralResponded(referralId: string, status: string, recipients: string[]) {
    return this.notify({
      referralId,
      type: 'REFERRAL_RESPONDED',
      message: `Referral has been ${status.toLowerCase()}`,
      recipients,
    });
  }

  async notifyPatientArrived(referralId: string, recipients: string[]) {
    return this.notify({
      referralId,
      type: 'PATIENT_ARRIVED',
      message: 'Patient has arrived at the receiving hospital',
      recipients,
    });
  }

  async notifyClinicalDataUnlocked(referralId: string, recipients: string[]) {
    return this.notify({
      referralId,
      type: 'CLINICAL_DATA_UNLOCKED',
      message: 'Clinical data unlocked by specialist',
      recipients,
    });
  }

  async notifyFeedbackSubmitted(referralId: string, recipients: string[]) {
    return this.notify({
      referralId,
      type: 'FEEDBACK_SUBMITTED',
      message: 'Feedback submitted for referral',
      recipients,
    });
  }

  async notifyReferralExpired(referralId: string, recipients: string[]) {
    return this.notify({
      referralId,
      type: 'REFERRAL_EXPIRED',
      message: 'Referral expired automatically',
      recipients,
    });
  }
  // notification.service.ts
async sendOtpToPatient(phone: string, otp: string, hospitalName: string) {
  const message = `Your referral to ${hospitalName} is accepted. Use OTP: ${otp} to unlock your clinical data at the hospital.`;
  
  // If you don't have an SMS provider yet, just log it:
  console.log(`[SMS SENT TO ${phone}]: ${message}`);
  
  // Integration example (Twilio):
  // await this.twilioClient.messages.create({ body: message, to: phone, from: '...' });
}
}
