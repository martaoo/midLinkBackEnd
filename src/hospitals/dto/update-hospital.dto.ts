import { IsOptional, IsEnum, IsObject, ValidateNested, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TrafficLightStatus, HospitalService, HospitalSpecialization, HospitalLevel } from '../../common/enums/hospital.enum';

//
// --- BED CAPACITY DTO ---
//
export class BedCapacityDto {
  @IsOptional()
  total?: number;

  @IsOptional()
  available?: number;
}

//
// --- LIAISON OFFICER UPDATE DTO ---
//
export class UpdateHospitalLiaisonDto {
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => BedCapacityDto)
  bedCapacity?: Record<string, BedCapacityDto>; // ICU, General, etc.

  @IsOptional()
  @IsEnum(TrafficLightStatus)
  trafficLightStatus?: TrafficLightStatus;

  @IsOptional()
  @IsEnum(HospitalService, { each: true })
  services?: HospitalService[];

  @IsOptional()
  @IsEnum(HospitalSpecialization, { each: true })
  specializations?: HospitalSpecialization[];
}

//
// --- HOSPITAL ADMIN UPDATE DTO ---
//
export class UpdateHospitalAdminDto {
  @IsOptional()
  @IsEnum(HospitalService, { each: true })
  services?: HospitalService[];

  @IsOptional()
  @IsEnum(HospitalSpecialization, { each: true })
  specializations?: HospitalSpecialization[];

  @IsOptional()
  @IsBoolean()
  hasMRI?: boolean;

  @IsOptional()
  @IsBoolean()
  hasCTScan?: boolean;

  @IsOptional()
  @IsBoolean()
  hasXRay?: boolean;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

//
// --- SYSTEM ADMIN UPDATE DTO ---
//
export class UpdateHospitalSystemAdminDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  woreda?: string;

  @IsOptional()
  @IsEnum(HospitalLevel)
  level?: HospitalLevel;

  @IsOptional()
  @IsEnum(TrafficLightStatus)
  trafficLightStatus?: TrafficLightStatus;

  @IsOptional()
  @IsEnum(HospitalService, { each: true })
  services?: HospitalService[];

  @IsOptional()
  @IsEnum(HospitalSpecialization, { each: true })
  specializations?: HospitalSpecialization[];

  @IsOptional()
  @IsBoolean()
  hasMRI?: boolean;

  @IsOptional()
  @IsBoolean()
  hasCTScan?: boolean;

  @IsOptional()
  @IsBoolean()
  hasXRay?: boolean;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
