import { 
  Body, 
  Controller, 
  Get, 
  Param, 
  Post, 
  Patch, 
  Delete, 
  UseGuards, 
  Req 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- CREATE USER (Hospital Admin or System Admin only) ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Post()
  async createUser(@Req() req, @Body() createUserDto: CreateUserDto) {
    const hospitalId = req.user.role === UserRole.HOSPITAL_ADMIN ? req.user.hospitalId : undefined;
    return this.usersService.createUser(createUserDto, hospitalId);
  }

  // --- GET ALL USERS ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Get()
  async findAll(@Req() req) {
    const hospitalId = req.user.role === UserRole.HOSPITAL_ADMIN ? req.user.hospitalId : undefined;
    return this.usersService.findAll(hospitalId);
  }

  // --- GET USER BY ID ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Get(':id')
  async findById(@Req() req, @Param('id') id: string) {
    const hospitalId = req.user.role === UserRole.HOSPITAL_ADMIN ? req.user.hospitalId : undefined;
    return this.usersService.findById(id, hospitalId);
  }

  // --- UPDATE USER ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Patch(':id')
  async updateUser(@Req() req, @Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const hospitalId = req.user.role === UserRole.HOSPITAL_ADMIN ? req.user.hospitalId : undefined;
    return this.usersService.updateUser(id, updateUserDto, hospitalId);
  }

  // --- DELETE USER ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HOSPITAL_ADMIN, UserRole.SYSTEM_ADMIN)
  @Delete(':id')
  async deleteUser(@Req() req, @Param('id') id: string) {
    const hospitalId = req.user.role === UserRole.HOSPITAL_ADMIN ? req.user.hospitalId : undefined;
    return this.usersService.deleteUser(id, hospitalId);
  }
}
