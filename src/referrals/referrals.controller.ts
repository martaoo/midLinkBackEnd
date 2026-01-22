import { Controller, Post, Patch, Body, Param, UseGuards, Req, BadRequestException, Get, ForbiddenException } from '@nestjs/common';
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
@Roles(UserRole.DOCTOR)
async createReferral(@Body() dto: CreateReferralDto, @Req() req) {
  console.log('--- DEBUG AUTH USER ---');
  console.log(req.user); // Check if this has .id, ._id, or .sub
  
  // Use a fallback to ensure something is always sent
  const userId = req.user.id || req.user._id || req.user.sub;
  
  if (!userId) {
    throw new BadRequestException('User ID not found in token');
  }

  return this.referralsService.createReferral(dto, userId);
}

  // ────────────── LIAISON OFFICER ──────────────
  @Patch(':id/send')
  @Roles(UserRole.LIAISON_OFFICER,UserRole.DOCTOR)
  async finalizeAndSend(
    @Param('id') id: string,
    @Body('targetHospitalId') targetHospitalId: string,
    @Req() req,
  ) {
    return this.referralsService.finalizeAndSend(id, req.user.id,  req.user.hospitalId, targetHospitalId,req.user.name);
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
  @Roles(UserRole.SPECIALIST,UserRole.LIAISON_OFFICER)
  async unlockReferral(@Body() dto: UnlockReferralDto, @Req() req) {
    return this.referralsService.unlockReferral(dto, req.user.id);
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
  @Roles(UserRole.LIAISON_OFFICER, UserRole.DOCTOR)
  async getLiaisonOutbox(@Req() req) {
    const hospitalId = req.user.hospitalId;
    if (!hospitalId) {
      throw new ForbiddenException('User is not assigned to a hospital');
    }
    return this.referralsService.getDraftsByHospital(hospitalId);
  }
} // Don't forget the closing bracket for the class!

