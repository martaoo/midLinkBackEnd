// dto/create-patient.dto.ts
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(['Male', 'Female'])
  sex: 'Male' | 'Female';

  @IsDateString()
  dateOfBirth: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;
}
