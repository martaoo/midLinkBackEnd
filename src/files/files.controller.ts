import { BadRequestException, Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import { UserRole } from "src/common/enums/user-role.enum";
import { RolesGuard } from "src/common/guards/roles.guard";
import { storage } from "src/config/cloudinary.config";  // Import the config above
import { ReferralsService } from "src/referrals/referrals.service";

@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post('upload-referral-doc')
  @Roles(UserRole.DOCTOR, UserRole.LIAISON_OFFICER)
  @UseInterceptors(FileInterceptor('file', { storage })) // Use Cloudinary storage here
  async uploadReferralFile(
    @UploadedFile() file: any, // Cloudinary returns a different object structure
    @Body('referralId') referralId: string,
    @Req() req,
  ) {
    if (!file) throw new BadRequestException('File upload failed');

    // Cloudinary gives you a 'path' (the URL) or 'secure_url'
    const filePath = file.path; 

    // Attach the URL to the referral in your DB
    await this.referralsService.attachFile(referralId, filePath, req.user.hospitalId);

    return {
      message: 'Medical document uploaded to cloud successfully',
      url: filePath,
    };
  }
}