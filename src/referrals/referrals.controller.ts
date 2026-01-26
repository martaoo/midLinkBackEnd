import { Controller, Post, Patch, Body, Param, UseGuards, Req, BadRequestException, Get, ForbiddenException, Query } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { 
  CreateReferralDto, 
  RespondReferralDto, 
  UnlockReferralDto, 
  GateCheckInDto, 
  SubmitFeedbackDto
} from './dto/referralDto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // JWT guard
import { RolesGuard } from 'src/common/guards/roles.guard';  // Optional role-based guard
import { Roles } from 'src/common/decorators/roles.decorator'; 
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard) // JWT + role checks
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // ────────────── DOCTOR ──────────────
@Post()
@Roles(UserRole.DOCTOR,UserRole.LIAISON_OFFICER)
async createReferral(@Body() dto: CreateReferralDto, @Req() req) {
  // 1. Extract info from the JWT (req.user)
  // Ensure your AuthGuard/Strategy populates these fields
  const userId = req.user.id || req.user._id || req.user.sub;
  const hospitalId = req.user.hospitalId; 
  const doctorName = req.user.fullName || req.user.name;

  if (!userId || !hospitalId) {
    throw new BadRequestException('User identification or Hospital ID missing from token');
  }

  // 2. Pass BOTH userId and hospitalId to the service
  // We also pass doctorName so the notification system has it immediately
  return this.referralsService.createReferral(dto, userId, hospitalId, doctorName);
}

// ────────────── LIAISON OFFICER / DOCTOR ──────────────
@Patch(':id/send')
@Roles(UserRole.LIAISON_OFFICER, UserRole.DOCTOR)
async finalizeAndSend(
  @Param('id') id: string,
  @Body('targetHospitalId') targetHospitalId: string,
  @Req() req,
) {
  // Using consistent naming from the request object
  const actorId = req.user.id || req.user._id;
  const hospitalId = req.user.hospitalId;
  const actorName = req.user.fullName || req.user.name;

  return this.referralsService.finalizeAndSend(
    id, 
    actorId, 
    hospitalId, 
    targetHospitalId, 
    actorName
  );
}
@Get('incoming')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LIAISON_OFFICER, UserRole.HOSPITAL_APPROVER,UserRole.HOSPITAL_ADMIN)
async getIncoming(@Req() req) {
  // req.user is populated by the JwtStrategy after verifying the token
  const hospitalId = req.user.hospitalId; 
  
  if (!hospitalId) {
    throw new ForbiddenException('User is not assigned to a hospital');
  }

  return this.referralsService.getIncomingReferrals(hospitalId);
}
  // ────────────── RECEIVING HOSPITAL / LIAISON ──────────────
  @Patch(':id/respond')
  @Roles(UserRole.HOSPITAL_APPROVER,UserRole.LIAISON_OFFICER)
  async respondToReferral(
    @Param('id') id: string,
    @Body() dto: RespondReferralDto,
    @Req() req,
  ) {
    return this.referralsService.respondToReferral(id, 
    dto, 
    req.user.id,          // responderId
    req.user.hospitalId);
  }

  // ────────────── GATE / SECURITY OFFICER ──────────────
  @Patch('gate-check-in')
  @Roles(UserRole.LIAISON_OFFICER,UserRole.GATEKEEPER) // Gate officers can be a separate role if needed
  async gateCheckIn(@Body() dto: GateCheckInDto, @Req() req) {
    return this.referralsService.gateCheckIn(dto, req.user.id);
  }

  // ────────────── SPECIALIST ──────────────
  @Post('unlock')
  @Roles(UserRole.DOCTOR, UserRole.SPECIALIST, UserRole.LIAISON_OFFICER)
  async unlockReferral(@Body() dto: UnlockReferralDto, @Req() req) {
    return this.referralsService.unlockReferral(dto, req.user.id,req.user.hospitalId);
  }

  // ────────────── SPECIALIST FEEDBACK ──────────────
  // ────────────── SPECIALIST FEEDBACK ──────────────
  @Patch(':id/complete')
  @Roles(UserRole.SPECIALIST,UserRole.LIAISON_OFFICER)
  async submitFeedback(
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto, // Use the DTO directly
    @Req() req,
  ) {
    return this.referralsService.submitFeedback(id, dto.feedbackNote, req.user.id);
  }
  @Get('liaison/outbox')
  @Roles(UserRole.LIAISON_OFFICER, UserRole.DOCTOR,UserRole.HOSPITAL_ADMIN)
  async getLiaisonOutbox(@Req() req) {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) {
      throw new ForbiddenException('User is not assigned to a hospital');
    }
    return this.referralsService.getOutgoingReferrals(hospitalId);
  }

  @Get('specialist/queue')
  @Roles(UserRole.LIAISON_OFFICER, UserRole.DOCTOR,UserRole.SPECIALIST)
  async getSpecialistQueue(@Req() req) {
    /**
     * req.user is usually populated by your Passport JWT Strategy.
     * It should contain the user's hospitalId.
     */
    const hospitalId = req.user.hospitalId;
    
    if (!hospitalId) {
      throw new BadRequestException('User hospital information missing');
    }

    return await this.referralsService.getSpecialistQueue(hospitalId);
  }
  @Get(':id')
  @Roles(UserRole.LIAISON_OFFICER, UserRole.DOCTOR,UserRole.SPECIALIST)
async getOne(@Param('id') id: string, @Req() req) {
  // req.user.hospitalId comes from your AuthGuard
  return this.referralsService.getReferralById(id, req.user.hospitalId);
}

  // ────────────── HOSPITAL DASHBOARD ──────────────
  @Get()
  @Roles(UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.SPECIALIST, UserRole.HOSPITAL_ADMIN, UserRole.HOSPITAL_APPROVER)
  async getReferrals(
    @Req() req,
    @Query('type') type: 'inbound' | 'outbound' = 'outbound',
  ) {
    const hospitalId = req.user.hospitalId;
    
    if (!hospitalId) {
      throw new BadRequestException('User hospital information missing');
    }

    return this.referralsService.getHospitalDashboard(
      hospitalId,
      type,
    );
  }

  @Get('dashboard/:type')
async getDashboard(@Param('type') type: 'inbound' | 'outbound', @Req() req) {
  return this.referralsService.getHospitalDashboard(req.user.hospitalId, type);
}
} // Don't forget the closing bracket for the class!
