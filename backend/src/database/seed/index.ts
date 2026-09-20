import { count, eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { driverDetails, profiles, routes, users } from '../schema';
import type { RouteStop } from '../schema';
import { UserRole } from '../../modules/auth/decorators/roles.decorator';

try {
  process.loadEnvFile();
} catch {
  // .env is optional; fall back to the default connection string below.
}

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/angkot-tracker';

const pool = new Pool({ connectionString });
const db = drizzle(pool);

const BCRYPT_ROUNDS = 12;

const ACCOUNTS = {
  admin: { email: 'admin@angkot.test', username: 'admin', password: 'admin1234' },
  driver: { email: 'driver@angkot.test', username: 'driver', password: 'driver1234' },
  passenger: { email: 'passenger@angkot.test', username: 'passenger', password: 'passenger1234' },
};

/** The four Bandung routes from the frontend dummy data, ready to serve. */
const ROUTES: Array<{
  code: string;
  name: string;
  origin: string;
  destination: string;
  fare: string;
  operatingHours: string;
  color: string;
  maxCapacity: number;
  stops: RouteStop[];
  path: [number, number][];
}> = [
  {
    code: '01A',
    name: 'Cicaheum - Ledeng',
    origin: 'Terminal Cicaheum',
    destination: 'Terminal Ledeng',
    fare: 'Rp 6.000',
    operatingHours: '05:00 - 21:00',
    color: '#059669',
    maxCapacity: 12,
    stops: [
      { id: 's-01-1', name: 'Terminal Cicaheum', coordinates: [107.6575, -6.9031], zone: 'East' },
      { id: 's-01-2', name: 'Gasibu / Gedung Sate', coordinates: [107.6186, -6.9004], zone: 'Central' },
      { id: 's-01-3', name: 'Simpang Dago', coordinates: [107.6162, -6.8858], zone: 'North' },
      { id: 's-01-4', name: 'Terminal Ledeng', coordinates: [107.5962, -6.8586], zone: 'North' },
    ],
    path: [
      [107.6575, -6.9031],
      [107.6412, -6.9095],
      [107.6253, -6.9015],
      [107.6186, -6.9004],
      [107.6162, -6.8858],
      [107.6012, -6.8715],
      [107.5962, -6.8586],
    ],
  },
  {
    code: '05',
    name: 'Dago - Kebon Kalapa',
    origin: 'Terminal Dago',
    destination: 'Kebon Kalapa',
    fare: 'Rp 5.000',
    operatingHours: '05:30 - 22:00',
    color: '#2563eb',
    maxCapacity: 12,
    stops: [
      { id: 's-02-1', name: 'Terminal Dago', coordinates: [107.6162, -6.8722], zone: 'North' },
      { id: 's-02-2', name: 'Dipatiukur (UNPAD)', coordinates: [107.6186, -6.8927], zone: 'North' },
      { id: 's-02-3', name: 'Alun-Alun Bandung', coordinates: [107.6098, -6.9218], zone: 'Central' },
      { id: 's-02-4', name: 'Kebon Kalapa', coordinates: [107.6053, -6.9283], zone: 'South' },
    ],
    path: [
      [107.6162, -6.8722],
      [107.6186, -6.8927],
      [107.6105, -6.9085],
      [107.6098, -6.9218],
      [107.6053, -6.9283],
    ],
  },
  {
    code: '08',
    name: 'Cicaheum - Ciroyom',
    origin: 'Terminal Cicaheum',
    destination: 'Stasiun Ciroyom',
    fare: 'Rp 6.000',
    operatingHours: '05:00 - 20:30',
    color: '#d97706',
    maxCapacity: 12,
    stops: [
      { id: 's-03-1', name: 'Terminal Cicaheum', coordinates: [107.6575, -6.9031], zone: 'East' },
      { id: 's-03-2', name: 'Stasiun Bandung', coordinates: [107.6025, -6.9142], zone: 'Central' },
      { id: 's-03-3', name: 'Stasiun Ciroyom', coordinates: [107.5898, -6.9125], zone: 'West' },
    ],
    path: [
      [107.6575, -6.9031],
      [107.6385, -6.9158],
      [107.6128, -6.9174],
      [107.6025, -6.9142],
      [107.5898, -6.9125],
    ],
  },
  {
    code: '32',
    name: 'Elang - Gedebage',
    origin: 'Terminal Elang',
    destination: 'Terminal Gedebage',
    fare: 'Rp 6.000',
    operatingHours: '05:30 - 21:00',
    color: '#8b5cf6',
    maxCapacity: 14,
    stops: [
      { id: 's-04-1', name: 'Terminal Elang', coordinates: [107.5712, -6.9185], zone: 'West' },
      { id: 's-04-2', name: 'Alun-Alun Bandung', coordinates: [107.6098, -6.9218], zone: 'Central' },
      { id: 's-04-3', name: 'Soekarno-Hatta MTC', coordinates: [107.6342, -6.9458], zone: 'South' },
      { id: 's-04-4', name: 'Terminal Gedebage', coordinates: [107.6925, -6.9532], zone: 'East' },
    ],
    path: [
      [107.5712, -6.9185],
      [107.5921, -6.9232],
      [107.6098, -6.9218],
      [107.6342, -6.9458],
      [107.6658, -6.9512],
      [107.6925, -6.9532],
    ],
  },
];

async function upsertUser(
  account: { email: string; username: string; password: string },
  role: UserRole,
) {
  await db
    .insert(users)
    .values({
      email: account.email,
      username: account.username,
      passwordHash: await bcrypt.hash(account.password, BCRYPT_ROUNDS),
      role,
      status: 'active',
      emailVerifiedAt: new Date(),
    })
    .onConflictDoNothing({ target: users.email });

  const [user] = await db.select().from(users).where(eq(users.email, account.email)).limit(1);
  return user!;
}

async function ensureProfile(userId: string, data: { fullName: string; city: string; country: string; birthDate: string }) {
  const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (existing) return existing;

  const [profile] = await db.insert(profiles).values({ userId, ...data }).returning();
  return profile;
}

async function main() {
  const admin = await upsertUser(ACCOUNTS.admin, UserRole.Admin);
  const driver = await upsertUser(ACCOUNTS.driver, UserRole.Driver);
  const passenger = await upsertUser(ACCOUNTS.passenger, UserRole.Passenger);

  await ensureProfile(admin.id, { fullName: 'Admin Angkot', city: 'Bandung', country: 'Indonesia', birthDate: '1990-01-01' });
  await ensureProfile(driver.id, { fullName: 'Budi Santoso', city: 'Bandung', country: 'Indonesia', birthDate: '1992-04-17' });
  await ensureProfile(passenger.id, { fullName: 'Siti Aminah', city: 'Bandung', country: 'Indonesia', birthDate: '2000-05-12' });

  await db
    .insert(driverDetails)
    .values({
      userId: driver.id,
      identityCardNumber: '3273010101920001',
      vehiclePlateNumber: 'D 1984 AB',
      routeCode: '01A',
      vehicleManufactureYear: 2018,
      startRoute: 'Terminal Cicaheum',
      endRoute: 'Terminal Ledeng',
      passengerCapacity: 12,
      activatedAt: new Date(),
    })
    .onConflictDoNothing({ target: driverDetails.userId });

  for (const route of ROUTES) {
    await db
      .insert(routes)
      .values({
        ...route,
        status: 'approved',
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      })
      .onConflictDoNothing({ target: routes.code });
  }

  const [routeTotal] = await db.select({ value: count() }).from(routes);

  console.log('\nSeed complete.');
  console.log(`  Routes available: ${routeTotal?.value ?? 0}`);
  console.log('  Sign in with:');
  console.log(`    admin     ${ACCOUNTS.admin.email} / ${ACCOUNTS.admin.password}`);
  console.log(`    driver    ${ACCOUNTS.driver.email} / ${ACCOUNTS.driver.password}`);
  console.log(`    passenger ${ACCOUNTS.passenger.email} / ${ACCOUNTS.passenger.password}`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\nSeed failed:', error);
    await pool.end();
    process.exit(1);
  });
