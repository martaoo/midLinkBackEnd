import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    readonly userModel: Model<UserDocument>,
  ) {}

  // --- CREATE USER ---
  async createUser(dto: CreateUserDto,  creatorRole: UserRole,hospitalId?: string,  ): Promise<User> {
     // 1. SYSTEM ADMIN → must NOT have hospitalId
  if (dto.role === UserRole.SYSTEM_ADMIN && creatorRole !== UserRole.SYSTEM_ADMIN) {
  throw new ForbiddenException('Only System Admin can create System Admin');
}

  // 2. All other roles → hospitalId is REQUIRED
  if (dto.role !== UserRole.SYSTEM_ADMIN && !hospitalId) {
    throw new BadRequestException('Hospital ID is required');
  }

  // 3. Assign hospitalId for hospital-scoped users
  if (dto.role !== UserRole.SYSTEM_ADMIN) {
    dto.hospitalId = hospitalId;
  }
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
