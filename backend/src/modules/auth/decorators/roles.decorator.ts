import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = 'roles';

export enum UserRole {
    Admin = "admin",
    Driver = "driver",
    Passenger = "passenger"
}

export const USER_ROLES = [UserRole.Admin, UserRole.Driver, UserRole.Passenger] as const;

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);