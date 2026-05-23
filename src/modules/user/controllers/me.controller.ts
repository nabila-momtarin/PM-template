import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { MyService } from '../service/me.service';

@Controller('me')
export class MyController {
  constructor(private readonly myService: MyService) {}

  @Get()
  getMe(@CurrentUser() user: AuthenticatedUser) {
    {
      return this.myService.getMe(user);
    }
  }
}
