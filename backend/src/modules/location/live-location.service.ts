import { Injectable, Logger } from '@nestjs/common';
import { ProfileRepository } from '../profiles/profiles.repository';
import { DriverRepository } from '../drivers/driver.repository';
import { NotificationsService } from '../notifications/notifications.service';
import {
  bearingDegrees,
  citiesMatch,
  compassLabel,
  findNearestCity,
  haversineKm,
  INDONESIA_CITIES,
} from './geo';
import type { Coordinates } from './geo';

/** A driver position is considered live for this long after the last update. */
const ACTIVE_TTL_MS = 90_000;
/** How long a passenger's "looking for an angkot" intent stays warm. */
const SEARCH_TTL_MS = 10 * 60_000;
/** Results are limited to this radius around the searcher. */
const SEARCH_RADIUS_KM = 5;
/** Notifications only fire for people this close. */
const NOTIFY_RADIUS_KM = 3;
/** Don't tell the same driver twice about the same searcher within this window. */
const DRIVER_NOTIFY_COOLDOWN_MS = 5 * 60_000;

interface LiveDriver {
  userId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speedKmh: number | null;
  updatedAt: number;
}

interface SearchIntent {
  latitude: number;
  longitude: number;
  at: number;
  /** Null when the visitor was not signed in. */
  userId: string | null;
}

/**
 * Searches are keyed by account, or by an opaque id the browser keeps when the
 * visitor has no account, so one visitor's repeat searches stay one intent.
 */
function searchKey(userId: string | null, visitorId: string | null) {
  if (userId) return `user:${userId}`;
  if (visitorId) return `anon:${visitorId}`;

  return null;
}

export interface ActiveDriver {
  userId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speedKmh: number | null;
  updatedAt: number;
  name: string;
  plateNumber: string | null;
  routeCode: string | null;
  startRoute: string | null;
  endRoute: string | null;
  capacity: number | null;
  city: string | null;
  distanceKm?: number;
  /** Compass bearing from the requested origin to this driver. */
  bearingDegrees?: number;
}

@Injectable()
export class LiveLocationService {
  private readonly logger = new Logger(LiveLocationService.name);

  private readonly drivers = new Map<string, LiveDriver>();
  private readonly searches = new Map<string, SearchIntent>();
  private readonly notified = new Map<string, number>();

  constructor(
    private readonly profiles: ProfileRepository,
    private readonly driverRepository: DriverRepository,
    private readonly notifications: NotificationsService,
  ) {}

  /** Driver started (or refreshed) sharing their position. */
  async updateDriverLocation(userId: string, position: Coordinates & { heading?: number; speedKmh?: number }) {
    const wasActive = this.isActive(userId);

    this.drivers.set(userId, {
      userId,
      latitude: position.latitude,
      longitude: position.longitude,
      heading: position.heading ?? null,
      speedKmh: position.speedKmh ?? null,
      updatedAt: Date.now(),
    });

    // Only announce the transition to online, not every position ping.
    if (!wasActive) {
      await this.notifyNearbySearchers(userId);
    }

    return { sharing: true };
  }

  /** Driver stopped sharing (went offline). */
  stopDriverLocation(userId: string) {
    this.drivers.delete(userId);

    return { sharing: false };
  }

  isSharing(userId: string) {
    return this.isActive(userId);
  }

  /** Everyone currently sharing a position, optionally limited to one city. */
  async listActiveDrivers(origin?: Coordinates, city?: string | null): Promise<ActiveDriver[]> {
    this.prune();
    const ids = [...this.drivers.keys()];
    if (ids.length === 0) return [];

    const [profiles, details] = await Promise.all([
      this.profiles.findByUserIds(ids),
      this.driverRepository.findManyByUserIds(ids),
    ]);

    const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
    const detailByUser = new Map(details.map((detail) => [detail.userId, detail]));

    return ids
      .map((id) => {
        const live = this.drivers.get(id)!;
        const profile = profileByUser.get(id);
        const detail = detailByUser.get(id);

        const driver: ActiveDriver = {
          userId: id,
          latitude: live.latitude,
          longitude: live.longitude,
          heading: live.heading,
          speedKmh: live.speedKmh,
          updatedAt: live.updatedAt,
          name: profile?.fullName ?? 'Pengemudi',
          plateNumber: detail?.vehiclePlateNumber ?? null,
          routeCode: detail?.routeCode ?? null,
          startRoute: detail?.startRoute ?? null,
          endRoute: detail?.endRoute ?? null,
          capacity: detail?.passengerCapacity ?? null,
          city: profile?.city ?? null,
        };

        if (origin) {
          driver.distanceKm = haversineKm(origin, live);
          driver.bearingDegrees = Number(bearingDegrees(origin, live).toFixed(0));
        }

        return driver;
      })
      .filter((driver) => !city || citiesMatch(driver.city, city))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  /** Cities the detector knows about — the ones a route can be published for. */
  listCities() {
    return { cities: INDONESIA_CITIES.map((city) => city.name) };
  }

  /** Which city a position belongs to — resolved locally, no geocoder call. */
  detectCity(origin: Coordinates) {
    const match = findNearestCity(origin);

    if (!match) {
      return { city: null, matched: false, distanceKm: null };
    }

    return {
      city: {
        name: match.city.name,
        latitude: match.city.latitude,
        longitude: match.city.longitude,
      },
      matched: true,
      distanceKm: Number(match.distanceKm.toFixed(2)),
    };
  }

  /**
   * Someone is looking for the nearest angkot. Everyone gets the closest
   * matches, and anyone — signed in or not — becomes findable by nearby
   * drivers, which is the whole point of searching.
   */
  async searchNearby(
    searcher: { userId: string | null; visitorId?: string | null },
    origin: Coordinates,
  ) {
    const key = searchKey(searcher.userId, searcher.visitorId ?? null);

    if (key) {
      this.searches.set(key, { ...origin, at: Date.now(), userId: searcher.userId });
    }

    const drivers = await this.listActiveDrivers(origin);
    const nearby = drivers.filter((driver) => (driver.distanceKm ?? Infinity) <= SEARCH_RADIUS_KM);
    const nearest = nearby[0] ?? null;

    if (key) {
      await this.notifyNearbyDrivers(key, searcher.userId, origin, nearby);
    }

    // A visitor without an account has no inbox, so only they skip this half.
    if (searcher.userId) {
      const userId = searcher.userId;

      if (nearest) {
        await this.notifications.notify(userId, {
          type: 'nearby_angkot.found',
          title: 'Angkot terdekat ditemukan',
          body: `${nearest.plateNumber ?? 'Angkot'}${nearest.routeCode ? ` (${nearest.routeCode})` : ''} sekitar ${nearest.distanceKm?.toFixed(1)} km di arah ${compassLabel(bearingDegrees(origin, nearest))} dari lokasi Anda.`,
          data: { driverUserId: nearest.userId },
        });
      } else {
        await this.notifications.notify(userId, {
          type: 'nearby_angkot.found',
          title: 'Belum ada angkot aktif di sekitar',
          body: `Tidak ada pengemudi yang membagikan lokasi dalam radius ${SEARCH_RADIUS_KM} km saat ini.`,
          data: {},
        });
      }
    }

    return {
      drivers: nearby,
      nearest,
      radiusKm: SEARCH_RADIUS_KM,
    };
  }

  /**
   * Drivers look for passengers: who recently searched for an angkot nearby.
   * Positions are only exposed while the passenger is close enough to reach,
   * and a visitor who never signed in is reported as anonymous.
   */
  async listNearbyPassengers(driverUserId: string) {
    const live = this.drivers.get(driverUserId);
    const sharing = Boolean(live) && this.isActive(driverUserId);

    if (!live || !sharing) {
      return { passengers: [], sharing: false, radiusKm: SEARCH_RADIUS_KM };
    }

    this.prune();

    const passengers = [...this.searches.values()]
      .filter((search) => search.userId !== driverUserId)
      .map((search) => ({
        distanceKm: haversineKm(live, search),
        requestedAt: search.at,
        // Which way the driver should head to reach the passenger.
        bearingDegrees: Number(bearingDegrees(live, search).toFixed(0)),
        // Only passengers this close are exposed, so the driver can navigate to
        // them. Searching for an angkot is what shares this position.
        latitude: search.latitude,
        longitude: search.longitude,
        // Visitors who never signed in are found too, they just have no name.
        anonymous: search.userId === null,
      }))
      .filter((entry) => entry.distanceKm <= SEARCH_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return { passengers, sharing: true, radiusKm: SEARCH_RADIUS_KM };
  }

  /**
   * Tell drivers that someone nearby is looking for an angkot. Anonymous
   * visitors notify drivers just like signed-in ones — they are picked up
   * exactly the same — the only difference is that they cannot be notified back.
   */
  private async notifyNearbyDrivers(
    searcherKey: string,
    searcherUserId: string | null,
    origin: Coordinates,
    drivers: ActiveDriver[],
  ) {
    const targets = drivers.filter((driver) =>
      driver.userId !== searcherUserId && (driver.distanceKm ?? Infinity) <= NOTIFY_RADIUS_KM);

    for (const target of targets) {
      const key = `${target.userId}:${searcherKey}`;
      const last = this.notified.get(key) ?? 0;
      if (Date.now() - last < DRIVER_NOTIFY_COOLDOWN_MS) continue;

      this.notified.set(key, Date.now());

      await this.notifications.notify(target.userId, {
        type: 'passenger_search.created',
        title: 'Penumpang mencari angkot di sekitar Anda',
        body: `Seseorang mencari angkot sekitar ${target.distanceKm?.toFixed(1)} km di arah ${compassLabel(bearingDegrees(target, origin))} dari posisi Anda.`,
        data: { latitude: origin.latitude, longitude: origin.longitude },
      });
    }
  }

  /** A driver just came online — ping passengers who recently searched nearby. */
  private async notifyNearbySearchers(driverId: string) {
    const live = this.drivers.get(driverId);
    if (!live) return;

    const [detail] = await this.driverRepository.findManyByUserIds([driverId]);
    const label = detail?.vehiclePlateNumber
      ? `${detail.vehiclePlateNumber}${detail.routeCode ? ` (${detail.routeCode})` : ''}`
      : 'Sebuah angkot';

    for (const search of this.searches.values()) {
      if (search.userId === driverId) continue;
      // Nobody to notify: this searcher was never signed in.
      if (!search.userId) continue;
      if (Date.now() - search.at > SEARCH_TTL_MS) continue;

      const distanceKm = haversineKm(search, live);
      if (distanceKm > NOTIFY_RADIUS_KM) continue;

      await this.notifications.notify(search.userId, {
        type: 'driver_online.nearby',
        title: 'Angkot baru aktif di sekitar Anda',
        body: `${label} aktif sekitar ${distanceKm.toFixed(1)} km di arah ${compassLabel(bearingDegrees(search, live))} dari lokasi pencarian Anda.`,
        data: { driverUserId: driverId },
      });
    }
  }

  private isActive(userId: string) {
    const live = this.drivers.get(userId);
    if (!live) return false;

    return Date.now() - live.updatedAt <= ACTIVE_TTL_MS;
  }

  /** Drop anything that has gone stale. */
  private prune() {
    const now = Date.now();

    for (const [id, live] of this.drivers) {
      if (now - live.updatedAt > ACTIVE_TTL_MS) this.drivers.delete(id);
    }

    for (const [id, search] of this.searches) {
      if (now - search.at > SEARCH_TTL_MS) this.searches.delete(id);
    }

    for (const [key, at] of this.notified) {
      if (now - at > DRIVER_NOTIFY_COOLDOWN_MS) this.notified.delete(key);
    }
  }
}
