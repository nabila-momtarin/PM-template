import { Controller, Get, Query } from '@nestjs/common';
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
  @Get('me/tasks')
  getCurrentUserTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('filter') filter?: string,
  ) {
    return this.summaryService.getCurrentUserTasks(
      user.userId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.max(1, parseInt(limit, 10) || 10),
      filter,
    );
  }

  @SkipRbac()
  @Get('worktime-overview')
  getWorktimeOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.summaryService.getWorktimeOverview(startDate, endDate);
  }

  @SkipRbac()
  @Get('me/worktime-overview')
  getCurrentUserWorktimeOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.summaryService.getCurrentUserWorktimeOverview(user.userId, startDate, endDate);
  }

  @SkipRbac()
  @Get('me/ticket-summary')
  getCurrentUserTicketSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.summaryService.getCurrentUserTicketSummary(user.userId);
  }

  @SkipRbac()
  @Get('me/task-summary')
  getCurrentUserTaskSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.summaryService.getCurrentUserTaskSummary(user.userId);
  }

  @SkipRbac()
  @Get('me/active-ticket')
  getCurrentUserActiveTicket(@CurrentUser() user: AuthenticatedUser) {
    return this.summaryService.getCurrentUserActiveTicket(user.userId);
  }

  @SkipRbac()
  @Get('me/active-task')
  getCurrentUserActiveTask(@CurrentUser() user: AuthenticatedUser) {
    return this.summaryService.getCurrentUserActiveTask(user.userId);
  }
}