import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { UserService } from "../../user.service";
import { CreateUserDto } from "../../dto/admin-create-user.dto";
import { UsersQueryDto } from "../../dto/getAll-users.dto";

@Controller('/users')
export class AdminController {
    constructor( private readonly userService: UserService) {}

    @Post()
    async createUser(@Body() dto: CreateUserDto) {

        console.log("CONTROLLER : admin : createUser\n");

        return this.userService.createUser(dto);
    }

    @Get()
    async allUsers(@Query() query: UsersQueryDto) {
        console.log("CONTROLLER : admin : allUsers\n");

        return this.userService.getAllUsers(query);
    }

    @Get(':id')
    async getUserById(@Param('id') id: string) {
        console.log("CONTROLLER : admin : getUser\n");

        return this.userService.getAUser(id);
        
    }
    
    @Delete(':id')
    async deleteUser(@Param('id') id: string) {
        console.log("CONTROLLER : admin : delete user\n");

        return this.userService.deleteUser(id);
        }
}