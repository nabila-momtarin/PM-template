import { Controller, Get } from '@nestjs/common';
import { SummaryService } from '../service/summary.service';
import { SkipRbac } from 'src/infrastructure/auth/decorators/skip-rbac.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';

@Controller('dashboard')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @SkipRbac()
  @Get('userSummary')
  getUserSummary() {
    return this.summaryService.getUserSummary();
  }

  @SkipRbac()
  @Get('ticketSummary')
  getTicketSummary() {
    return this.summaryService.getTicketSummary();
  }

  @SkipRbac()
  @Get('taskSummary')
  getTaskSummary() {
    return this.summaryService.getTaskSummary();
  }

  @SkipRbac()
  @Get('me/active-task')
  getCurrentUserActiveTask(@CurrentUser() user: AuthenticatedUser) {
    console.log('Authenticated User:', user);
    return this.summaryService.getCurrentUserActiveTask(user.userId);
  }
}