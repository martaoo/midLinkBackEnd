import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalLiaisonDto, UpdateHospitalAdminDto, UpdateHospitalSystemAdminDto } from './dto/update-hospital.dto';
import { Hospital } from './schemas/hospital.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  // --- CREATE HOSPITAL (System Admin Only) ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @Post()
  async create(@Body() createHospitalDto: CreateHospitalDto): Promise<Hospital> {
    return this.hospitalsService.createHospital(createHospitalDto);
  }

  // --- GET ALL HOSPITALS ---
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(): Promise<Hospital[]> {
    return this.hospitalsService.findAll();
  }

  // --- GET HOSPITAL BY ID ---
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string): Promise<Hospital> {
    return this.hospitalsService.findById(id);
  }

  // --- UPDATE HOSPITAL (Role-Based) ---
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LIAISON_OFFICER, UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  async updateHospital(@Param('id') id: string, @Body() body: any, @Req() req) {
    const role = req.user.role;
    const hospitalId = req.user.hospitalId;

    let dto;

    // Assign correct DTO based on role
    if (role === UserRole.LIAISON_OFFICER) {
      dto = Object.assign(new UpdateHospitalLiaisonDto(), body);
    } else if (role === UserRole.HOSPITAL_ADMIN) {
      dto = Object.assign(new UpdateHospitalAdminDto(), body);
    } else if (role === UserRole.SYSTEM_ADMIN) {
      dto = Object.assign(new UpdateHospitalSystemAdminDto(), body);
    } else {
      throw new BadRequestException('Invalid role for updating hospital');
    }

    return this.hospitalsService.updateHospital(id, dto, role, hospitalId);
  }
}
