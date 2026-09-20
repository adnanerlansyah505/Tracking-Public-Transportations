import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDTO } from './dto/list-notifications.dto';

const notificationIdPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new NotFoundException('Notification not found.'),
});

/** The signed-in user's own notification feed. */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: { id: string }, @Query() query: ListNotificationsDTO) {
    return this.notificationsService.list(user.id, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: { id: string },
    @Param('id', notificationIdPipe) id: string,
  ) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { id: string },
    @Param('id', notificationIdPipe) id: string,
  ) {
    return this.notificationsService.remove(user.id, id);
  }
}
