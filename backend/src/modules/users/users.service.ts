import { Injectable } from "@nestjs/common";
import { UserRepository } from "./users.repository";

@Injectable()
export class UsersService {

    constructor(
        private userRepository: UserRepository
    ) {}

    async list(page: number, pageSize: number) {

        const result = await this.userRepository.findAll(page, pageSize);

        return {
            users: result.users,
            metadata: result.metadata
        }
    }

}