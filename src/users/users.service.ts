import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { Hospital, HospitalDocument } from 'src/hospitals/schemas/hospital.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    @InjectModel(User.name)
    readonly userModel: Model<UserDocument>,
  ) {}

  // --- CREATE USER ---
 async createUser(
  dto: CreateUserDto,
  creatorRole: UserRole,
  hospitalIdFromToken?: string,
): Promise<User> {

  // --------------------------------------------------
  // 1. SYSTEM ADMIN CREATION RULES
  // --------------------------------------------------
  if (dto.role === UserRole.SYSTEM_ADMIN) {

    if (creatorRole !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        'Only System Admin can create System Admin accounts',
      );
    }

    // System Admins must not belong to any hospital
    dto.hospitalId = undefined;
  }

  // --------------------------------------------------
  // 2. HOSPITAL-SCOPED USER RULES
  // --------------------------------------------------
  if (dto.role !== UserRole.SYSTEM_ADMIN) {

    // Hospital Admin cannot create users outside their hospital
    if (creatorRole === UserRole.HOSPITAL_ADMIN && !hospitalIdFromToken) {
      throw new ForbiddenException('Hospital Admin is not linked to a hospital');
    }

    // Determine target hospital
    const targetHospitalId =
      creatorRole === UserRole.HOSPITAL_ADMIN
        ? hospitalIdFromToken
        : dto.hospitalId;

    if (!targetHospitalId) {
      throw new BadRequestException('Hospital ID is required for this role');
    }

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(targetHospitalId)) {
      throw new BadRequestException('Invalid Hospital ID format');
    }

    // Verify hospital exists
    const hospitalExists = await this.hospitalModel.exists({
      _id: targetHospitalId,
    });

    if (!hospitalExists) {
      throw new NotFoundException(
        `Hospital with ID ${targetHospitalId} does not exist`,
      );
    }

    dto.hospitalId = targetHospitalId;
  }

  // --------------------------------------------------
  // 3. PASSWORD & SAVE
  // --------------------------------------------------
  const hashedPassword = await bcrypt.hash(dto.password, 10);

  const user = new this.userModel({
    ...dto,
    password: hashedPassword,
  });

  return user.save();
}


  // --- FIND ALL USERS ---
  async findAll(hospitalId?: string): Promise<User[]> {
    const filter = hospitalId ? { hospitalId } : {};
    return this.userModel.find(filter).exec();
  }

  // --- FIND USER BY EMAIL ---
  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).select('+password');
  }

  // --- FIND USER BY ID ---
  async findById(id: string, hospitalId?: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (hospitalId && user.hospitalId.toString() !== hospitalId) {
      throw new NotFoundException('User not found in your hospital');
    }

    return user;
  }

  // --- UPDATE USER (ADMIN CANNOT CHANGE PASSWORD) ---
  async updateUser(id: string, dto: UpdateUserDto,creatorRole:UserRole, hospitalId?: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
if (dto.role && creatorRole !== UserRole.SYSTEM_ADMIN) {
  throw new ForbiddenException();
}

    if (hospitalId && user.hospitalId.toString() !== hospitalId) {
      throw new NotFoundException('User not found in your hospital');
    }

    // Prevent admin from updating password
    if ('password' in dto) {
      delete dto.password;
    }

    Object.assign(user, dto);
    return user.save();
  }

  // --- DELETE USER ---
  async deleteUser(id: string, hospitalId?: string): Promise<void> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (hospitalId && user.hospitalId.toString() !== hospitalId) {
      throw new NotFoundException('User not found in your hospital');
    }

    await this.userModel.deleteOne({ _id: id }).exec();
  }
}
