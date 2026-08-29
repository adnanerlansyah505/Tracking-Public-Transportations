// common/cache/cache-keys.ts

export const CacheKeys = {
  usersList: (page: number, pageSize: number) =>
        `users:list:${page}:${pageSize}`,

  user: (id: string) =>
    `user:${id}`,

  userProfile: (userId: string) =>
    `user:profile:${userId}`,

  profile: (id: string) =>
    `profile:${id}`,
};

export const UserCacheKeys = {
  list: (page: number, pageSize: number) =>
    `users:list:${page}:${pageSize}`,

  detail: (id: string) =>
    `users:detail:${id}`,
};