// patients.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * Search patients by nationalId or phone
   */
  @Post('search')
  @Roles(UserRole.DOCTOR, UserRole.LIAISON_OFFICER)
  search(@Body() dto: SearchPatientDto) {
    return this.patientsService.search(dto);
  }

  /**
   * Create a new patient
   */
  @Post()
  @Roles(UserRole.DOCTOR, UserRole.LIAISON_OFFICER)
  create(@Req() req, @Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto, req.user.hospitalId, req.user.id);
  }

  /**
   * Get patient by ID
   */
  @Get(':id')
  @Roles(UserRole.DOCTOR, UserRole.LIAISON_OFFICER)
  findById(@Param('id') id: string) {
    return this.patientsService.findById(id);
  }

  /**
   * Find existing patient by nationalId or create new
   */
  @Post('find-or-create')
  @Roles(UserRole.DOCTOR, UserRole.LIAISON_OFFICER)
  findOrCreate(@Req() req, @Body() dto: CreatePatientDto) {
    return this.patientsService.findOrCreate(
      dto,
      req.user.hospitalId,
      req.user.id,
    );
  }
}
