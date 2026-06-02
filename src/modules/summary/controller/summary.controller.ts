import { Controller, Get } from '@nestjs/common';
import { SummaryService } from '../service/summary.service';

@Controller()
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get('userSummary')
  getUserSummary() {
    return this.summaryService.getUserSummary();
  }

  @Get('ticketSummary')
  getTicketSummary() {
    return this.summaryService.getTicketSummary();
  }

  @Get('taskSummary')
  getTaskSummary() {
    return this.summaryService.getTaskSummary();
  }
}