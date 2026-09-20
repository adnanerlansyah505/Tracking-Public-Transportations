import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RoutesRepository } from './routes.repository';
import { UserRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../auth/decorators/roles.decorator';
import { CreateRouteDTO } from './dto/create-route.dto';
import { UpdateRouteDTO } from './dto/update-route.dto';
import { ListRoutesDTO } from './dto/list-routes.dto';
import type { RouteStop } from '../../database/schema';
import type { routes } from '../../database/schema';

type RouteInsert = typeof routes.$inferInsert;

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class RoutesService {
  constructor(
    private readonly routesRepository: RoutesRepository,
    private readonly usersRepository: UserRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query: ListRoutesDTO, requester: AuthenticatedUser) {
    const isAdmin = requester.role === UserRole.Admin;

    return this.routesRepository.findMany({
      page: query.page,
      pageSize: query.limit,
      status: isAdmin ? query.status : 'approved',
      search: query.search,
      city: query.city,
    });
  }

  /** Anonymous network view: approved routes only, optionally one city. */
  async listPublic(query: ListRoutesDTO) {
    return this.routesRepository.findMany({
      page: query.page,
      pageSize: query.limit,
      status: 'approved',
      search: query.search,
      city: query.city,
    });
  }

  async listRequests(query: ListRoutesDTO) {
    return this.routesRepository.findMany({
      page: query.page,
      pageSize: query.limit,
      status: 'pending',
      search: query.search,
    });
  }

  async listMine(driverId: string, query: ListRoutesDTO) {
    return this.routesRepository.findMany({
      page: query.page,
      pageSize: query.limit,
      status: query.status,
      search: query.search,
      submittedBy: driverId,
    });
  }

  async detail(id: string, requester: AuthenticatedUser) {
    const route = await this.find(id);
    const isOwner = route.submittedBy === requester.id;
    const isAdmin = requester.role === UserRole.Admin;

    if (route.status !== 'approved' && !isAdmin && !isOwner) {
      throw new NotFoundException('Route is not found.');
    }

    return route;
  }

  async create(dto: CreateRouteDTO, admin: AuthenticatedUser) {
    await this.assertCodeAvailable(dto.code);

    const { stops, path } = this.buildStopsAndPath(dto.stops);
    const now = new Date();

    return this.routesRepository.create({
      ...this.buildBaseFields(dto),
      stops,
      path,
      status: 'approved',
      submittedBy: admin.id,
      reviewedBy: admin.id,
      reviewedAt: now,
    });
  }

  async submitRequest(dto: CreateRouteDTO, driver: AuthenticatedUser) {
    await this.assertCodeAvailable(dto.code);

    const { stops, path } = this.buildStopsAndPath(dto.stops);

    const route = await this.routesRepository.create({
      ...this.buildBaseFields(dto),
      stops,
      path,
      status: 'pending',
      submittedBy: driver.id,
    });

    if (route) {
      await this.notifications.notifyAdmins({
        type: 'route_request.created',
        title: 'New route request',
        body: `${route.code} · ${route.name} was submitted by ${driver.email}.`,
        data: { routeId: route.id },
      });
    }

    return route;
  }

  async update(id: string, dto: UpdateRouteDTO, admin: AuthenticatedUser) {
    const route = await this.find(id);

    if (dto.code && dto.code.trim() !== route.code) {
      await this.assertCodeAvailable(dto.code);
    }

    const payload: Partial<RouteInsert> = {};

    if (dto.code !== undefined) payload.code = dto.code.trim();
    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.origin !== undefined) payload.origin = dto.origin.trim();
    if (dto.destination !== undefined) payload.destination = dto.destination.trim();
    if (dto.city !== undefined) payload.city = dto.city.trim();
    if (dto.fare !== undefined) payload.fare = dto.fare.trim();
    if (dto.operatingHours !== undefined) payload.operatingHours = dto.operatingHours.trim();
    if (dto.color !== undefined) payload.color = dto.color;
    if (dto.maxCapacity !== undefined) payload.maxCapacity = dto.maxCapacity;

    if (dto.stops) {
      const { stops, path } = this.buildStopsAndPath(dto.stops);
      payload.stops = stops;
      payload.path = path;
    }

    const updated = await this.routesRepository.update(id, payload);
    if (!updated) throw new NotFoundException('Route is not found.');

    return updated;
  }

  async approve(id: string, admin: AuthenticatedUser) {
    const route = await this.find(id);

    if (route.status !== 'pending') {
      throw new BadRequestException('Only pending route requests can be approved.');
    }

    const updated = await this.routesRepository.update(id, {
      status: 'approved',
      reviewedBy: admin.id,
      reviewedAt: new Date(),
      rejectionReason: null,
    });

    if (updated && route.submittedBy) {
      await this.notifications.notify(route.submittedBy, {
        type: 'route_request.approved',
        title: 'Route request approved',
        body: `${route.code} · ${route.name} is now visible to passengers.`,
        data: { routeId: route.id },
      });
    }

    return updated;
  }

  async reject(id: string, reason: string, admin: AuthenticatedUser) {
    const route = await this.find(id);

    if (route.status !== 'pending') {
      throw new BadRequestException('Only pending route requests can be rejected.');
    }

    const updated = await this.routesRepository.update(id, {
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    });

    if (updated && route.submittedBy) {
      await this.notifications.notify(route.submittedBy, {
        type: 'route_request.rejected',
        title: 'Route request rejected',
        body: `${route.code} · ${route.name}: ${reason.trim()}`,
        data: { routeId: route.id },
      });
    }

    return updated;
  }

  async remove(id: string) {
    const route = await this.find(id);
    await this.routesRepository.softDelete(route.id);
    return { message: 'Route deleted successfully.' };
  }

  async stats() {
    const [
      totalRoutes,
      approvedRoutes,
      pendingRequests,
      rejectedRequests,
      totalDrivers,
      totalPassengers,
    ] = await Promise.all([
      this.routesRepository.countByStatus(),
      this.routesRepository.countByStatus('approved'),
      this.routesRepository.countByStatus('pending'),
      this.routesRepository.countByStatus('rejected'),
      this.usersRepository.countByRole(UserRole.Driver),
      this.usersRepository.countByRole(UserRole.Passenger),
    ]);

    return {
      totalRoutes,
      approvedRoutes,
      pendingRequests,
      rejectedRequests,
      totalDrivers,
      totalPassengers,
    };
  }

  private async find(id: string) {
    const route = await this.routesRepository.findById(id);
    if (!route) throw new NotFoundException('Route is not found.');
    return route;
  }

  private async assertCodeAvailable(code: string) {
    const existing = await this.routesRepository.findByCode(code.trim());
    if (existing) {
      throw new ConflictException(`Route code "${code.trim()}" is already in use.`);
    }
  }

  private buildBaseFields(dto: CreateRouteDTO) {
    return {
      code: dto.code.trim(),
      name: dto.name.trim(),
      origin: dto.origin.trim(),
      destination: dto.destination.trim(),
      city: dto.city?.trim() || 'Bandung',
      fare: dto.fare.trim(),
      operatingHours: dto.operatingHours.trim(),
      maxCapacity: dto.maxCapacity,
      ...(dto.color ? { color: dto.color } : {}),
    };
  }

  private buildStopsAndPath(stops: CreateRouteDTO['stops']) {
    const mapped: RouteStop[] = stops.map((stop) => ({
      id: randomUUID(),
      name: stop.name.trim(),
      zone: stop.zone.trim(),
      coordinates: [stop.longitude, stop.latitude],
    }));

    return {
      stops: mapped,
      path: mapped.map((stop) => stop.coordinates) as [number, number][],
    };
  }
}
