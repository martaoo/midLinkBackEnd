import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Patient, PatientSchema } from './schemas/patient.schema';

@Module({
  imports:[MongooseModule.forFeature([{name:Patient.name,schema:PatientSchema}])],
  providers: [PatientsService],
  controllers: [PatientsController]
})
export class PatientsModule {}
