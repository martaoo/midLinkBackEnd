import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';
import { Hospital, HospitalSchema } from './schemas/hospital.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hospital.name, schema: HospitalSchema }
    ]),
  ],
  controllers: [HospitalsController],
  providers: [HospitalsService],
  exports: [MongooseModule],
})
export class HospitalsModule {}
