import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DriverService } from './driver.service';
import { Throttle } from '@nestjs/throttler';
import { ListDriversDTO } from './dto/list.dto';
import { UpsertDriverDetailsDTO } from './dto/upsert-driver-details.dto';
import { ListDriverRequestsDTO } from './dto/list-driver-requests.dto';
import { RejectDriverRequestDTO } from './dto/reject-driver-request.dto';

const driverRequestIdPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new NotFoundException('Driver request is not found.'),
});

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

  // Self-service: the signed-in driver's own vehicle details + change requests.
  @Roles(UserRole.Driver)
  @Get('me')
  getMyDriverDetails(@CurrentUser() user: { id: string }) {
    return this.driverService.getMyDetails(user.id);
  }

  @Roles(UserRole.Driver)
  @Get('me/requests')
  getMyDriverRequests(@CurrentUser() user: { id: string }) {
    return this.driverService.listMyVehicleRequests(user.id);
  }

  @Roles(UserRole.Driver)
  @Post('me/requests')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'registrationDocument', maxCount: 1 },
    { name: 'operationPermit', maxCount: 1 },
    { name: 'vehiclePhoto', maxCount: 1 },
  ]))
  submitMyDriverRequest(
    @CurrentUser() user: { id: string },
    @Body() dto: UpsertDriverDetailsDTO,
    @UploadedFiles() files: {
      registrationDocument?: Express.Multer.File[];
      operationPermit?: Express.Multer.File[];
      vehiclePhoto?: Express.Multer.File[];
    },
  ) {
    return this.driverService.submitMyVehicleRequest(user.id, dto, {
      registrationDocument: files?.registrationDocument?.[0],
      operationPermit: files?.operationPermit?.[0],
      vehiclePhoto: files?.vehiclePhoto?.[0],
    });
  }

  // Admin review queue for driver vehicle change requests.
  @Roles(UserRole.Admin)
  @Get('requests')
  listDriverRequests(@Query() query: ListDriverRequestsDTO) {
    return this.driverService.listVehicleRequests(query.status);
  }

  @Roles(UserRole.Admin)
  @Patch('requests/:id/approve')
  approveDriverRequest(
    @Param('id', driverRequestIdPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.driverService.approveVehicleRequest(id, user);
  }

  @Roles(UserRole.Admin)
  @Patch('requests/:id/reject')
  rejectDriverRequest(
    @Param('id', driverRequestIdPipe) id: string,
    @Body() dto: RejectDriverRequestDTO,
    @CurrentUser() user: { id: string },
  ) {
    return this.driverService.rejectVehicleRequest(id, dto.reason, user);
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
