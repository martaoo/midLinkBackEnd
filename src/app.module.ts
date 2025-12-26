import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HospitalsModule } from './hospitals/hospitals.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // 1. Setup ConfigModule to read .env
    ConfigModule.forRoot({
      isGlobal: true, // This makes .env variables available everywhere
    }),

    // 2. Setup Mongoose asynchronously
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),

    HospitalsModule,

    UsersModule,

    AuthModule,
  ],
})
export class AppModule {}