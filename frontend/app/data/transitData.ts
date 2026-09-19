export interface TransitStop {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  zone: string;
}

export interface TransitRoute {
  id: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  fare: string;
  operatingHours: string;
  color: string;
  stops: TransitStop[];
  path: [number, number][]; // [lng, lat] sequence
}

export interface AngkotVehicle {
  id: string;
  plateNumber: string;
  angkotCode: string;
  routeId: string;
  routeName: string;
  driverName: string;
  currentCapacity: number;
  maxCapacity: number;
  speedKmH: number;
  status: 'active' | 'crowded' | 'full' | 'idle';
  currentCoordinates: [number, number];
  currentHeading: number;
  nextStopName: string;
  etaMinutes: number;
  progressPercent: number;
  direction: 1 | -1;
}

export type RouteStatus = 'pending' | 'approved' | 'rejected';

/** A stop supplied through the route form; converted to a RouteStop by the API. */
export interface RouteStopInput {
  name: string;
  zone: string;
  latitude: number;
  longitude: number;
}

/** Create/update payload for both admin routes and driver route requests. */
export interface RoutePayload {
  code: string;
  name: string;
  origin: string;
  destination: string;
  fare: string;
  operatingHours: string;
  color: string;
  maxCapacity: number;
  stops: RouteStopInput[];
}

/** A route as returned by the API, including its review workflow fields. */
export interface ManagedRoute extends TransitRoute {
  status: RouteStatus;
  maxCapacity: number;
  submittedBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteStats {
  totalRoutes: number;
  approvedRoutes: number;
  pendingRequests: number;
  rejectedRequests: number;
  totalDrivers: number;
  totalPassengers: number;
}

export const BANDUNG_CENTER: [number, number] = [107.6191, -6.9039];

export function interpolatePositionAlongPath(
  path: [number, number][],
  progress: number
): { coordinates: [number, number]; heading: number } {
  const first = path[0];
  const last = path[path.length - 1];
  if (!first || !last) return { coordinates: [0, 0], heading: 0 };

  if (path.length === 1 || progress <= 0) return { coordinates: first, heading: 0 };
  if (progress >= 1) return { coordinates: last, heading: 0 };

  const totalSegments = path.length - 1;
  const rawIndex = progress * totalSegments;
  const segmentIndex = Math.min(Math.floor(rawIndex), totalSegments - 1);
  const segmentProgress = rawIndex - segmentIndex;

  const p1 = path[segmentIndex];
  const p2 = path[segmentIndex + 1];
  if (!p1 || !p2) return { coordinates: first, heading: 0 };

  const lng = p1[0] + (p2[0] - p1[0]) * segmentProgress;
  const lat = p1[1] + (p2[1] - p1[1]) * segmentProgress;

  const deltaLng = p2[0] - p1[0];
  const deltaLat = p2[1] - p1[1];
  const angleRad = Math.atan2(deltaLng, deltaLat);
  const heading = (angleRad * (180 / Math.PI) + 360) % 360;

  return { coordinates: [lng, lat], heading };
}

const PLATE_LETTERS = ['AB', 'CG', 'XY', 'KL', 'FF', 'QA', 'TZ', 'HN'];

/**
 * Place a pair of simulated vehicles on each real route so the live map has
 * something to animate. Positions are derived from the route path and are not
 * real telemetry — a vehicles/GPS API does not exist yet.
 */
export function buildSimulatedVehicles(
  routes: Array<TransitRoute & { maxCapacity?: number }>,
): AngkotVehicle[] {
  const vehicles: AngkotVehicle[] = [];

  routes.forEach((route, routeIndex) => {
    if (route.path.length < 2) return;

    const count = 2;

    for (let index = 0; index < count; index += 1) {
      const progress = (index + 1) / (count + 1);
      const { coordinates, heading } = interpolatePositionAlongPath(route.path, progress);

      const maxCapacity = route.maxCapacity && route.maxCapacity > 0 ? route.maxCapacity : 12;
      const currentCapacity = Math.max(1, Math.round(maxCapacity * (0.35 + 0.35 * index)));
      const ratio = currentCapacity / maxCapacity;
      const status: AngkotVehicle['status'] = ratio >= 1 ? 'full' : ratio >= 0.8 ? 'crowded' : 'active';

      vehicles.push({
        id: `${route.id}-sim-${index + 1}`,
        plateNumber: `D ${1000 + routeIndex * 10 + index * 3} ${PLATE_LETTERS[(routeIndex + index) % PLATE_LETTERS.length]}`,
        angkotCode: route.code,
        routeId: route.id,
        routeName: route.name,
        driverName: 'Simulated position',
        currentCapacity,
        maxCapacity,
        speedKmH: 18 + ((routeIndex * 7 + index * 5) % 22),
        status,
        currentCoordinates: coordinates,
        currentHeading: heading,
        nextStopName: route.stops[index % Math.max(1, route.stops.length)]?.name ?? route.origin,
        etaMinutes: 2 + ((routeIndex + index) % 6),
        progressPercent: progress,
        direction: 1,
      });
    }
  });

  return vehicles;
}
