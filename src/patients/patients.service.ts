import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient, PatientDocument } from './schemas/patient.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name)
    private patientModel: Model<PatientDocument>,
  ) {}

  async search(dto: SearchPatientDto): Promise<PatientDocument[]> {
    return this.patientModel.find({
      $or: [
        dto.nationalId ? { nationalId: dto.nationalId } : {},
        dto.phone ? { phone: dto.phone } : {},
      ],
    });
  }

  async create(
    dto: CreatePatientDto,
    hospitalId: string,
    userId: string,
  ): Promise<PatientDocument> {
    if (!userId) {
    console.error('FATAL: Patient creation failed because userId is undefined!');
    throw new BadRequestException('createdBy (userId) is required to register a patient');
  }
    if (dto.nationalId) {
      const exists = await this.patientModel.findOne({
        nationalId: dto.nationalId,
      });
      if (exists) {
        throw new BadRequestException('Patient already exists');
      }
    }

    const patient = await this.patientModel.create({
      ...dto,
      createdAtHospital: hospitalId,
      createdBy: userId,
    });

    return patient;
  }

  async findById(patientId: string): Promise<PatientDocument> {
    const patient = await this.patientModel.findById(patientId);
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }

  async findOrCreate(
    dto: CreatePatientDto,
    hospitalId: string,
    userId: string,
  ): Promise<PatientDocument> {
    let patient: PatientDocument | null = null;

    if (dto.nationalId) {
      patient = await this.patientModel.findOne({ nationalId: dto.nationalId });
    }

    if (!patient) {
      patient = await this.create(dto, hospitalId, userId);
    }

    return patient;
  }
}
