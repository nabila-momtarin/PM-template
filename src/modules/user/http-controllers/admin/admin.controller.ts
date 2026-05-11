import { Body, Controller, Post } from "@nestjs/common";
import { UserService } from "../../user.service";
import { CreateUserDto } from "../../dto/admin-create-user.dto";

@Controller('/users')
export class AdminController {
    constructor( private readonly userService: UserService) {}

    @Post()
    async createUser(@Body() dto: CreateUserDto) {

        console.log("CONTROLLER : admin : createUser\n");

        return this.userService.createUser(dto);
    }
}