import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { DriversController } from './drivers.controller';
import { DriverService } from './driver.service';
import { DriverRepository } from './driver.repository';
import { AuthRepository } from '../auth/auth.repository';

@Module({
  imports: [UsersModule],
  controllers: [DriversController],
  providers: [DriverService, DriverRepository, AuthRepository],
  exports: [DriverRepository],
})
export class DriversModule {}
