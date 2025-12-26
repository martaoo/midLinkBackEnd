import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../common/enums/user-role.enum';

interface JwtPayload {
  sub: string;            // user ID
  role: UserRole;         // user role
  hospitalId?: string;    // optional hospitalId for hospital admins
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    // Attach necessary info to req.user
    return {
      userId: payload.sub,
      role: payload.role,
      hospitalId: payload.hospitalId, // undefined for system admins
    };
  }
}
