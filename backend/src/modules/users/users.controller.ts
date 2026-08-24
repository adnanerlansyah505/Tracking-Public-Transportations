import { Controller, Get, Query } from "@nestjs/common";
import { UsersService } from "./users.service";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { Throttle } from "@nestjs/throttler";

@Roles(UserRole.Admin)
@Controller("users")
export class UsersController {
    constructor (private readonly users: UsersService) {}

    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Get()
    list(@Query() query) {
        return this.users.list(query.page, query.limit);
    }
}