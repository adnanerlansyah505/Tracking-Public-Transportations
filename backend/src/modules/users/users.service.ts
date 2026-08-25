import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as bcrypt from "bcrypt";

import { UserRepository } from './users.repository';
import { UserCacheKeys } from '../../common/cache/cache-keys';
import { CreateUserDTO } from './dto/create.dto';
import { UpdateUserDTO } from './dto/update.dto';
import { UserSerializer } from './serializers/users.serializer';

@Injectable()
export class UsersService {

    constructor(
        private readonly userRepository: UserRepository,

        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    async list(page: number, pageSize: number) {
        const cacheKey = `users:list:${page}:${pageSize}`;

        // 1. Try to get data from cache
        const cached = await this.cacheManager.get(cacheKey);

        if (cached) {
            return cached;
        }

        // 2. Cache miss → query database
        const data = await this.userRepository.findAll(
            page,
            pageSize,
        );

        const result = {
            users: data.users.map((item) => ({
                ...item,
                users: new UserSerializer(item.users),
            })),
            metadata: data.metadata,
        };

        // 3. Store result in cache
        await this.cacheManager.set(
            cacheKey,
            result,
            60_000, // 60 seconds
        );

        return result;
    }

    async detail(identifier: string) {
        const cacheKey = `user:${identifier}`;

        const cached = await this.cacheManager.get(cacheKey);

        if (cached) {
            return cached;
        }

        const user = await this.userRepository.find(identifier);

        if (user) {
            await this.cacheManager.set(
                cacheKey,
                user,
                60_000,
            );
        }

        return user;
    }

    // =========================
    // CREATE
    // =========================

  async create(dto: CreateUserDTO) {

    // Check duplicate email
    const existing =
      await this.userRepository.findByEmail(
        dto.email,
      );

    if (existing) {
      throw new ConflictException(
        'Email is already registered',
      );
    }

    // Hash password
    const passwordHash =
      await bcrypt.hash(
        dto.password,
        12,
      );

    const user =
      await this.userRepository.create({
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
      });

    // New user changes list results
    await this.clearUserListCache();

    return user;
  }


    // =========================
    // UPDATE
    // =========================

    async update(
        id: string,
        dto: UpdateUserDTO,
    ) {

        const existing =
        await this.userRepository.findById(id);

        if (!existing) {
            throw new NotFoundException(
                'User not found',
            );
        }

        const updateData: Record<string, any> = {
            ...dto,
        };

        // Password needs to be hashed
        if (dto.password) {
            updateData.passwordHash =
                await bcrypt.hash(
                    dto.password,
                    12,
                );

            delete updateData.password;
        }

        // Don't allow empty update
        if (
            Object.keys(updateData).length === 0
        ) {
            return existing;
        }

        const user =
        await this.userRepository.update(
            id,
            updateData,
        );

        // Invalidate detail cache
        await this.cacheManager.del(
        UserCacheKeys.detail(id),
        );

        // Invalidate list cache
        await this.clearUserListCache();

        return user;
    }

    // =========================
    // DELETE
    // =========================

    async delete(id: string) {
        const user =
        await this.userRepository.delete(id);

        if (!user) {
            throw new NotFoundException(
                'User not found',
            );
        }

        // Remove detail cache
        await this.cacheManager.del(
            UserCacheKeys.detail(id),
        );

        // Remove all list caches
        await this.clearUserListCache();

        return user;
    }


    // =========================
    // CACHE INVALIDATION
    // =========================

    private async clearUserListCache() {
        /**
         * This implementation depends on your
         * cache-manager store.
         *
         * If your store supports reset(), you can
         * clear the cache here.
         */
        await this.cacheManager.clear();
    }
}