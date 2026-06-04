import { Body, Controller, Get, Patch, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { MyService } from '../service/me.service';
import { UpdateMeDto } from '../dto/update-me.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from 'src/common/upload/multer-options';
import { ChangePasswordDto } from '../dto/my-password.dto';
import { SkipRbac } from 'src/infrastructure/auth/decorators/skip-rbac.decorator';
import { MyPriorityService } from '../service/my-priority.service';
import { MyPriorityQueryDto } from '../dto/my-priority.dto';


@Controller('me')
export class MyController {
  constructor(
    private readonly myService: MyService,
    private readonly myPriorityService: MyPriorityService,
  ) {}

  @SkipRbac()
  @Get()
  getMe(@CurrentUser() user: AuthenticatedUser) {
    {
      return this.myService.getMe(user);
    }
  }

  @SkipRbac()
  @Patch('change-password')
  changeMyPassword(@Body() dto: ChangePasswordDto, @CurrentUser() me: AuthenticatedUser) {
    {
      return this.myService.changeMyPassword(dto, me);
    }
  }

  @SkipRbac()
  @Patch()
  @UseInterceptors(FileInterceptor('photo', createMulterOptions('profilePhoto')))
  updateMe(
    @Body() dto: UpdateMeDto,
    @UploadedFile() file: Express.Multer.File /*  | undefined */,
    @CurrentUser() me: AuthenticatedUser,
  ) {
    {
      return this.myService.updateMe(dto, file, me);
    }
  }


  @SkipRbac()
  @Get('my-priority-tasks')
  getMyPriorityTasks(@CurrentUser() me: AuthenticatedUser, @Query() query: MyPriorityQueryDto) {
    return this.myPriorityService.getMyPriorityTasks(me, query);
  }


}

