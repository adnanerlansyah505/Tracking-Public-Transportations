import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { DriverService } from './driver.service';
import { Throttle } from '@nestjs/throttler';
import { ListDriversDTO } from './dto/list.dto';

/** Admin-only lifecycle controls for registered driver accounts. */
@Roles(UserRole.Admin)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driverService: DriverService) {}

  @Throttle({
    default: {
      limit: 3,
      ttl: 60000,
    },
  })
  @Get()
  list(
    @Query() query: ListDriversDTO,
  ) {
    return this.driverService.list(
      query.page,
      query.limit,
    );
  }

  @Patch(':id/activate')
  activate(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new NotFoundException('Driver is not found.'),
      }),
    )
    id: string,
  ) {
    return this.driverService.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new NotFoundException('Driver is not found.'),
      }),
    )
    id: string,
  ) {
    return this.driverService.deactivate(id);
  }
}
