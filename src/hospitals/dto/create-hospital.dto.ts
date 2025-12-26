import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  HospitalLevel,
  TrafficLightStatus,
  HospitalService,
  HospitalSpecialization,
} from '../../common/enums/hospital.enum';

//
// --- BED CAPACITY DTO ---
//
export class BedCapacityDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  available?: number;
}

//
// --- CREATE HOSPITAL DTO ---
//
export class CreateHospitalDto {
  // --- IDENTIFICATION ---
  @IsString()
  @IsNotEmpty()
  name: string;

  // --- LOCATION ---
  @IsString()
  @IsNotEmpty()
  region: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  woreda?: string;

  // --- LEVEL ---
  @IsEnum(HospitalLevel)
  level: HospitalLevel;

  // --- SERVICES (Dynamic Array) ---
  @IsOptional()
  @IsEnum(HospitalService, { each: true })
  services?: HospitalService[];

  // --- SPECIALIZATIONS ---
  @IsOptional()
  @IsEnum(HospitalSpecialization, { each: true })
  specializations?: HospitalSpecialization[];

  // --- BED CAPACITY ---
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => BedCapacityDto)
  bedCapacity?: Record<string, BedCapacityDto>; // ICU, General, etc.

  // --- STATUS ---
  @IsOptional()
  @IsEnum(TrafficLightStatus)
  trafficLightStatus?: TrafficLightStatus;

  // --- CONTACT ---
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
