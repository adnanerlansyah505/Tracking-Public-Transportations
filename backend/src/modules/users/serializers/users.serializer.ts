// user.serializer.ts

import {
  Exclude,
} from 'class-transformer';

export class UserSerializer {

  id!: string;

  email!: string;

  role!: string;

  status!: string;

  emailVerifiedAt!: Date | null;

  createdAt!: Date;

  updatedAt!: Date;

  // NEVER expose these fields
  @Exclude()
  passwordHash!: string;

  @Exclude()
  deletedAt!: Date | null;

  constructor(partial: Partial<UserSerializer>) {
    Object.assign(this, partial);
  }
}