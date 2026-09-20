import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { RoutesRepository } from './routes.repository';

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [RoutesController],
  providers: [RoutesService, RoutesRepository],
  exports: [RoutesRepository],
})
export class RoutesModule {}
