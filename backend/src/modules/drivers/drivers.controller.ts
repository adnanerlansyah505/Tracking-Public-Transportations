import { Controller, NotFoundException, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { DriverService } from './driver.service';

/** Admin-only lifecycle controls for registered driver accounts. */
@Roles(UserRole.Admin)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driverService: DriverService) {}

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
