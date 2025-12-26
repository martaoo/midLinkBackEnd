import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './common/enums/user-role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  await usersService.createUser(
  {
    fullName: 'Marta',
    email: 'systemadmin@example.com',
    password: 'password123',
    role: UserRole.SYSTEM_ADMIN,
  },
  UserRole.SYSTEM_ADMIN, // creatorRole
);

  console.log('System Admin created');
  await app.close();
}

bootstrap();
