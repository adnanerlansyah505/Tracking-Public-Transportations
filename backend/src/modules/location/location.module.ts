import { Module } from '@nestjs/common';
import { ProfilesModule } from '../profiles/profiles.module';
import { DriversModule } from '../drivers/drivers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LocationController } from './location.controller';
import { LiveLocationService } from './live-location.service';

@Module({
  imports: [ProfilesModule, DriversModule, NotificationsModule],
  controllers: [LocationController],
  providers: [LiveLocationService],
  exports: [LiveLocationService],
})
export class LocationModule {}
