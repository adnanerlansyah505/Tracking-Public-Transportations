import { pgEnum } from "drizzle-orm/pg-core";

export const routeStatusEnum = pgEnum('route_status', [
    'pending',
    'approved',
    'rejected',
]);

export type RouteStatus = (typeof routeStatusEnum.enumValues)[number];
