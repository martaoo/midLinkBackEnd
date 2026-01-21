import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { ReferralsModule } from 'src/referrals/referrals.module';

@Module({
  // REMOVE ReferralsService from here
  imports: [ReferralsModule], 
  controllers: [FilesController]
})
export class FilesModule {}