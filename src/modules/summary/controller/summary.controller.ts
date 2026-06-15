import { Controller, Get } from '@nestjs/common';
import { SummaryService } from '../service/summary.service';
import { SkipRbac } from 'src/infrastructure/auth/decorators/skip-rbac.decorator';

@Controller()
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
}