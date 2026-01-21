import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // auth.service.ts
async login(email: string, password: string) {
  const user = await this.usersService.findByEmail(email);
  
  // 1. Check if user exists
  if (!user) throw new UnauthorizedException('Invalid credentials');

  // 2. Defensive check: Ensure password exists in the user object
  if (!password || !user.password) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // 3. Compare
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new UnauthorizedException('Invalid credentials');

  const payload = {
    sub: user._id,
    role: user.role,
    hospitalId: user.hospitalId,
  };

  return {
    access_token: this.jwtService.sign(payload),
  };
}
}
