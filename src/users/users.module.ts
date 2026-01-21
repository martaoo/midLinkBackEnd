import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Hospital, HospitalSchema } from 'src/hospitals/schemas/hospital.schema';

@Module({
  imports:[MongooseModule.forFeature([{name:User.name,schema:UserSchema},{name:Hospital.name,schema:HospitalSchema}])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
