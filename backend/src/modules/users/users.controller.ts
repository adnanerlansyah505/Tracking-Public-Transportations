import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { UsersService } from './users.service';

import {
  Roles,
  UserRole,
} from '../auth/decorators/roles.decorator';

import { Throttle } from '@nestjs/throttler';

import { ListUsersDTO } from './dto/list.dto';
import { CreateUserDTO } from './dto/create.dto';
import { UpdateUserDTO } from './dto/update.dto';

@Roles(UserRole.Admin)
@Controller('users')
export class UsersController {

  constructor(
    private readonly users: UsersService,
  ) {}

  // GET /users?page=1&limit=10
  @Throttle({
    default: {
      limit: 3,
      ttl: 60000,
    },
  })
  @Get()
  list(
    @Query() query: ListUsersDTO,
  ) {
    return this.users.list(
      query.page,
      query.limit,
    );
  }

  // GET /users/:id
  @Get(':id')
  detail(
    @Param('id') id: string,
  ) {
    return this.users.detail(id);
  }

  // POST /users
  @Post()
  create(
    @Body() dto: CreateUserDTO,
  ) {
    return this.users.create(dto);
  }

  // PATCH /users/:id
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDTO,
  ) {
    return this.users.update(
      id,
      dto,
    );
  }

  // DELETE /users/:id
  @Delete(':id')
  delete(
    @Param('id') id: string,
  ) {
    return this.users.delete(id);
  }
}