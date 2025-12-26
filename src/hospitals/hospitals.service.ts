import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hospital, HospitalDocument } from './schemas/hospital.schema';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import {
  UpdateHospitalLiaisonDto,
  UpdateHospitalAdminDto,
  UpdateHospitalSystemAdminDto,
} from './dto/update-hospital.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectModel(Hospital.name)
    private readonly hospitalModel: Model<HospitalDocument>,
  ) {}

  // --- CREATE HOSPITAL (System Admin Only) ---
  async createHospital(dto: CreateHospitalDto): Promise<HospitalDocument> {
    const hospital = new this.hospitalModel(dto);
    return hospital.save();
  }

  // --- GET ALL HOSPITALS ---
  async findAll(): Promise<HospitalDocument[]> {
    return this.hospitalModel.find().exec();
  }

  // --- GET HOSPITAL BY ID ---
  async findById(id: string): Promise<HospitalDocument> {
    const hospital = await this.hospitalModel.findById(id).exec();
    if (!hospital) throw new NotFoundException('Hospital not found');
    return hospital;
  }

  // --- UPDATE HOSPITAL (Role-Based, Production Ready) ---
  async updateHospital(
    id: string,
    dto: UpdateHospitalLiaisonDto | UpdateHospitalAdminDto | UpdateHospitalSystemAdminDto,
    role: UserRole,
    userHospitalId?: string,
  ): Promise<HospitalDocument> {
    if (!Object.keys(dto).length) {
      throw new BadRequestException('No fields provided for update');
    }

    const hospital = await this.findById(id);

    // --- SECURITY: Cross-Hospital Check ---
    if (role !== UserRole.SYSTEM_ADMIN) {
      if (!userHospitalId || hospital._id.toString() !== userHospitalId) {
        throw new ForbiddenException('Access denied: You can only manage your own hospital');
      }
    }

    // --- DEFINE ALLOWED FIELDS PER ROLE ---
    let allowedFields: string[] = [];
    if (role === UserRole.LIAISON_OFFICER) {
      allowedFields = ['bedCapacity', 'trafficLightStatus', 'services', 'specializations'];
    } else if (role === UserRole.HOSPITAL_ADMIN) {
      allowedFields = ['services', 'specializations', 'hasMRI', 'hasCTScan', 'hasXRay', 'phone', 'email'];
    } else if (role === UserRole.SYSTEM_ADMIN) {
      allowedFields = Object.keys(dto); // All fields
    }

    // --- PREPARE ATOMIC UPDATE PAYLOAD ---
    const updatePayload: any = {};

    for (const key of Object.keys(dto)) {
      if (!allowedFields.includes(key)) {
        throw new ForbiddenException(`Your role cannot update: ${key}`);
      }

      // --- VALIDATION: BedCapacity ---
      if (key === 'bedCapacity' && role === UserRole.LIAISON_OFFICER) {
        const beds = dto['bedCapacity'] as Record<string, { total?: number; available?: number }>;
        for (const ward in beds) {
          const total = hospital.bedCapacity[ward]?.total ?? 0;
          const available = beds[ward].available ?? hospital.bedCapacity[ward]?.available ?? 0;
          if (available > total) {
            throw new BadRequestException(
              `Available beds (${available}) cannot exceed total beds (${total}) in ${ward}`,
            );
          }
        }
      }

      updatePayload[key] = dto[key];
    }

    // --- AUTOMATIC TIMESTAMP ---
    updatePayload.lastStatusUpdate = new Date();

    // --- ATOMIC UPDATE ---
    const updatedHospital = await this.hospitalModel.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    ).exec();

    if (!updatedHospital) throw new NotFoundException('Hospital not found after update');

    return updatedHospital;
  }
}
