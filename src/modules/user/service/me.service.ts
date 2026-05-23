import { Injectable, Logger } from "@nestjs/common";
import { UserRepository } from "../repositroy/user.repository";
import { AuthenticatedUser } from "src/infrastructure/auth/types/auth.types";

@Injectable()
export class MyService {
    constructor(private readonly userRepository: UserRepository) { }

    private logger = new Logger(MyService.name)

    async getMe(me: AuthenticatedUser) {
        this.logger.log('...');

        const myProfile = await this.userRepository.findById({ 
            id: me.userId, 
            useLean: true,
            select: '-password -__v -isDeleted -deletedAt -deletedBy -createdBy -updatedAt'
         });

        this.logger.debug(`Fetched User: Me: SERVICE: ${myProfile}`);

        return {
            success: true,
            message: "Profile fetched successfully",
            data: myProfile
        }
    }
}