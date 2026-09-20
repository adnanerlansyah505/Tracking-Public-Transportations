import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { RoutesService } from './routes.service';
import type { AuthenticatedUser } from './routes.service';
import { CreateRouteDTO } from './dto/create-route.dto';
import { UpdateRouteDTO } from './dto/update-route.dto';
import { RejectRouteDTO } from './dto/reject-route.dto';
import { ListRoutesDTO } from './dto/list-routes.dto';

const routeIdPipe = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new NotFoundException('Route is not found.'),
});

/**
 * Route management. Admin-created routes are approved immediately; driver
 * submissions are pending until an admin reviews them.
 *
 * Static paths are declared before the `:id` routes so they are matched first.
 */
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Roles(UserRole.Admin, UserRole.Driver, UserRole.Passenger)
  @Get()
  list(@Query() query: ListRoutesDTO, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.list(query, user);
  }

  /** Public network for the landing page — approved routes only, no auth. */
  @Public()
  @Get('public')
  listPublic(@Query() query: ListRoutesDTO) {
    return this.routesService.listPublic(query);
  }

  @Roles(UserRole.Admin)
  @Get('stats')
  stats() {
    return this.routesService.stats();
  }

  @Roles(UserRole.Admin)
  @Get('requests')
  requests(@Query() query: ListRoutesDTO) {
    return this.routesService.listRequests(query);
  }

  @Roles(UserRole.Driver)
  @Get('mine')
  mine(@Query() query: ListRoutesDTO, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.listMine(user.id, query);
  }

  @Roles(UserRole.Admin, UserRole.Driver, UserRole.Passenger)
  @Get(':id')
  detail(
    @Param('id', routeIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.detail(id, user);
  }

  @Roles(UserRole.Admin)
  @Post()
  create(@Body() dto: CreateRouteDTO, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.create(dto, user);
  }

  @Roles(UserRole.Driver)
  @Post('requests')
  submitRequest(@Body() dto: CreateRouteDTO, @CurrentUser() user: AuthenticatedUser) {
    return this.routesService.submitRequest(dto, user);
  }

  @Roles(UserRole.Admin)
  @Patch(':id')
  update(
    @Param('id', routeIdPipe) id: string,
    @Body() dto: UpdateRouteDTO,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.update(id, dto, user);
  }

  @Roles(UserRole.Admin)
  @Patch(':id/approve')
  approve(
    @Param('id', routeIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.approve(id, user);
  }

  @Roles(UserRole.Admin)
  @Patch(':id/reject')
  reject(
    @Param('id', routeIdPipe) id: string,
    @Body() dto: RejectRouteDTO,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.reject(id, dto.reason, user);
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  remove(@Param('id', routeIdPipe) id: string) {
    return this.routesService.remove(id);
  }
}
