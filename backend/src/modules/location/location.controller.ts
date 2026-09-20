import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { LiveLocationService } from './live-location.service';
import { UpdateLocationDTO } from './dto/update-location.dto';
import { SearchLocationDTO } from './dto/search-location.dto';
import { ActiveDriversQueryDTO } from './dto/active-drivers-query.dto';

/**
 * Live positions. Drivers publish their own; the active-driver list is public
 * because the whole point of the app is tracking angkots on a map.
 */
@Controller('location')
export class LocationController {
  constructor(private readonly liveLocation: LiveLocationService) {}

  @Roles(UserRole.Driver)
  @Put('me')
  updateMyLocation(@CurrentUser() user: { id: string }, @Body() dto: UpdateLocationDTO) {
    return this.liveLocation.updateDriverLocation(user.id, dto);
  }

  @Roles(UserRole.Driver)
  @Delete('me')
  stopMyLocation(@CurrentUser() user: { id: string }) {
    return this.liveLocation.stopDriverLocation(user.id);
  }

  @Get('me')
  myLocationState(@CurrentUser() user: { id: string }) {
    return { sharing: this.liveLocation.isSharing(user.id) };
  }

  @Public()
  @Get('active-drivers')
  async activeDrivers(@Query() query: ActiveDriversQueryDTO) {
    const origin = query.latitude !== undefined && query.longitude !== undefined
      ? { latitude: query.latitude, longitude: query.longitude }
      : undefined;

    return { drivers: await this.liveLocation.listActiveDrivers(origin, query.city) };
  }

  /** Which city a visitor is in, so the map can switch networks automatically. */
  @Public()
  @Get('city')
  city(@Query() query: SearchLocationDTO) {
    return this.liveLocation.detectCity({
      latitude: query.latitude,
      longitude: query.longitude,
    });
  }

  /** Cities a route can be published for. */
  @Public()
  @Get('cities')
  cities() {
    return this.liveLocation.listCities();
  }

  /** Driver side of the coin: passengers nearby who are looking for an angkot. */
  @Roles(UserRole.Driver)
  @Get('passengers')
  nearbyPassengers(@CurrentUser() user: { id: string }) {
    return this.liveLocation.listNearbyPassengers(user.id);
  }

  /**
   * Open to everyone — a visitor should be able to find the nearest angkot
   * without an account, and drivers should be able to find them in return.
   * Signed-in people are identified so they can be notified back.
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post('search')
  search(
    @CurrentUser() user: { id: string } | undefined,
    @Body() dto: SearchLocationDTO,
  ) {
    return this.liveLocation.searchNearby(
      { userId: user?.id ?? null, visitorId: dto.visitorId ?? null },
      { latitude: dto.latitude, longitude: dto.longitude },
    );
  }
}
