import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Referral, ReferralSchema } from './schemas/referral.schema';
import { Notification, NotificationSchema } from './schemas/notfiationSchema.schema';
import { NotificationService } from './notification.service';
import { PatientsService } from 'src/patients/patients.service';
import { Patient, PatientSchema } from 'src/patients/schemas/patient.schema';
import { Hospital, HospitalSchema } from 'src/hospitals/schemas/hospital.schema';

@Module({
  imports:[MongooseModule.forFeature([{name:Referral.name,schema:ReferralSchema},{name:Notification.name,schema:NotificationSchema},{name:Patient.name,schema:PatientSchema},{name:Hospital.name,schema:HospitalSchema}])],
  providers: [ReferralsService,NotificationService,PatientsService],
  controllers: [ReferralsController],
  exports: [ReferralsService],
})
export class ReferralsModule {}
