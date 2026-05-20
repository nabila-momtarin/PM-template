import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { UserService } from '../../admin.service';
import { CreateUserDto } from '../dto/admin-create-user.dto';
import { UsersQueryDto } from '../dto/admin-getAll-users.dto';
import { UpdateUserDto } from '../dto/admin-update-user.dto';
import { ResetPasswordDto } from '../dto/admin-reset-password.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';

@Controller('/users')
export class AdminController {
  constructor(private readonly userService: UserService) {}
  private logger = new Logger(AdminController.name);

  @Post()
  async createUser(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug('CONTROLLER : admin : createUser\n');

    return this.userService.createUser(dto, user);
  }

  @Get()
  async allUsers(@Query() query: UsersQueryDto) {
    console.log('CONTROLLER : admin : allUsers\n');

    return this.userService.getAllUsers(query);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    console.log('CONTROLLER : admin : getUser\n');

    return this.userService.getAUser(id);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    console.log('CONTROLLER : admin : delete user\n');

    return this.userService.deleteUser(id);
  }

  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    console.log('CONTROLLER : admin : update user\n');

    return this.userService.updateUser(id, dto);
  }

  @Patch(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    console.log('CONTROLLER : admin : resetPassword\n');

    return this.userService.resetPassword(id, dto);
  }
}
