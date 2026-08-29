import { pgEnum } from "drizzle-orm/pg-core";
import { UserRole } from "../../../modules/auth/decorators/roles.decorator";

export const userRoleEnum = pgEnum('user_role', [
    UserRole.Admin,
    UserRole.Driver,
    UserRole.Passenger
]);

export const userStatusEnum = pgEnum('user_status', [
    'pending_activation',
    'active',
    'inactive',
    'suspended',
]);
