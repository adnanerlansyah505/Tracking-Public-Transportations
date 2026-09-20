import { pgEnum } from "drizzle-orm/pg-core";

export const driverRequestStatusEnum = pgEnum('driver_request_status', [
    'pending',
    'approved',
    'rejected',
]);

export type DriverRequestStatus = (typeof driverRequestStatusEnum.enumValues)[number];
