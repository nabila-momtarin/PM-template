import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateUserDto } from '../dto/admin-create-user.dto';
import { UsersQueryDto } from '../dto/admin-getAll-users.dto';
import { UpdateUserDto } from '../dto/admin-update-user.dto';
import { ResetPasswordDto } from '../dto/admin-reset-password.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { AdminService } from '../service/admin.service';

@Controller('/users')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  private logger = new Logger(AdminController.name);

  @Post()
  async createUser(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug('CONTROLLER : admin : createUser\n');

    return this.adminService.createUser(dto, user);
  }

  @Get()
  async allUsers(@Query() query: UsersQueryDto) {

    this.logger.debug('CONTROLLER : admin : allUsers\n');

    return this.adminService.getAllUsers(query);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    this.logger.debug('CONTROLLER : admin : getUserById\n');

    return this.adminService.getAUser(id);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug('CONTROLLER : admin : delete user\n');

    return this.adminService.deleteUser(id, user);
  }

  @Patch(':id')
  async updateUser(
    @Param('id') id: string, 
    @Body() dto: UpdateUserDto,
  @CurrentUser() currentUser: AuthenticatedUser, 
  ) {

    this.logger.debug('...');

    return this.adminService.updateUser(id, dto, currentUser);
  }

  @Patch(':id/reset-password')
  async resetPassword(
    @Param('id') id: string, 
    @Body() dto: ResetPasswordDto,
    @CurrentUser() currentUser: AuthenticatedUser, 
  ) {

    this.logger.debug('...');

    return this.adminService.resetPassword(id, dto, currentUser);
  }
}
