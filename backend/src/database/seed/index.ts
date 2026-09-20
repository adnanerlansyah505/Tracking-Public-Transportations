import { count, eq, inArray } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { driverDetails, profiles, routes, users } from '../schema';
import { UserRole } from '../../modules/auth/decorators/roles.decorator';
import { BANDUNG_ROUTES, RETIRED_ROUTE_CODES } from './routes.data';

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

/** The trayek the seeded driver runs — one of the researched routes. */
const DRIVER_ROUTE = { code: '05', start: 'Terminal Cicaheum', end: 'Terminal Ledeng' };

const ACCOUNTS = {
  admin: { email: 'admin@angkot.test', username: 'admin', password: 'admin1234' },
  driver: { email: 'driver@angkot.test', username: 'driver', password: 'driver1234' },
  passenger: { email: 'passenger@angkot.test', username: 'passenger', password: 'passenger1234' },
};

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
      routeCode: DRIVER_ROUTE.code,
      vehicleManufactureYear: 2018,
      startRoute: DRIVER_ROUTE.start,
      endRoute: DRIVER_ROUTE.end,
      passengerCapacity: 12,
      activatedAt: new Date(),
    })
    .onConflictDoNothing({ target: driverDetails.userId });

  // Earlier seeds assigned the driver to 01A, a route the research replaced.
  await db
    .update(driverDetails)
    .set({ routeCode: DRIVER_ROUTE.code, startRoute: DRIVER_ROUTE.start, endRoute: DRIVER_ROUTE.end })
    .where(eq(driverDetails.routeCode, '01A'));

  for (const route of BANDUNG_ROUTES) {
    const values = {
      ...route,
      status: 'approved' as const,
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    };

    await db
      .insert(routes)
      .values(values)
      .onConflictDoUpdate({
        target: routes.code,
        set: {
          name: route.name,
          origin: route.origin,
          destination: route.destination,
          city: route.city,
          fare: route.fare,
          operatingHours: route.operatingHours,
          color: route.color,
          maxCapacity: route.maxCapacity,
          stops: route.stops,
          path: route.path,
          status: 'approved',
          reviewedBy: admin.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  // Dummy trayek from earlier seeds are absent from the research, so drop them.
  await db.delete(routes).where(inArray(routes.code, RETIRED_ROUTE_CODES));

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
