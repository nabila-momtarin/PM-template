import { Delete, Get, Logger, Param, Patch } from '@nestjs/common';
import { Body, Controller, Post, Query } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { TicketService } from '../service/ticket.service';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { TicketQueryDto } from '../dto/ticket-query.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { UpdateTickeDueDatetDto } from '../dto/update-ticket-due-date-.dto';
import { UpdateTicketQaStatusDto } from '../dto/update-ticket-qa-status.dto';


@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) { }

  private readonly logger = new Logger(TicketController.name);

  @Post()
  createTicket(@Body() dto: CreateTicketDto, @CurrentUser() currentUser: AuthenticatedUser) {

    this.logger.debug('CONTROLLER : admin : createTicket\n');

    return this.ticketService.createTicket(dto, currentUser);

  }

  @Get()
  getAllTickets(@Query() query: TicketQueryDto) {
    this.logger.debug('CONTROLLER : admin : getAllTickets\n');

    return this.ticketService.getAllTickets(query);
  }

  @Get(':id')
  getTicketById(@Param('id') id: string) {
    this.logger.debug('CONTROLLER : admin : getTicketById\n');

    return this.ticketService.getTicketById(id);
  }

  @Delete(':id')
  deleteTicket(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    this.logger.debug('CONTROLLER : admin : deleteTicket\n');

    return this.ticketService.deleteTicket(id, currentUser);
  }

  @Patch(':id')
  upadteTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto, @CurrentUser() currentUser: AuthenticatedUser) {
    this.logger.debug('CONTROLLER : admin : upadteTicket\n');

    return this.ticketService.updateTicket(id, dto, currentUser);
  }

  @Patch(':id/due-date')
  updateTicketDueDate(@Param('id') id: string, @Body() dto: UpdateTickeDueDatetDto, @CurrentUser() currentUser: AuthenticatedUser) {

    this.logger.debug('KEEP GOING\n');

    return this.ticketService.updateTicketDueDate(id, dto, currentUser);
  }

  @Patch(':id/change-qa-status')
  updateTicketQaStatus(@Param('id') id: string, @Body() dto: UpdateTicketQaStatusDto, @CurrentUser() currentUser: AuthenticatedUser) {

    this.logger.debug('KEEP GOING\n');

    return this.ticketService.updateTicketQaStatus(id, dto, currentUser);
  }

  @Patch(':id/change-status/in-progress')
  markInProgress(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {

    this.logger.debug('KEEP GOING\n');

    return this.ticketService.updateTicketToInProgress(id, currentUser);
  }

  @Patch(':id/change-status/developed')
  markInDevloped(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {

    this.logger.debug('KEEP GOING\n');

    return this.ticketService.updateTicketToDeveloped(id, currentUser);
  }

    @Patch(':id/change-status/qa-in-progress')
  markInQAInProgress(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {

    this.logger.debug('KEEP GOING\n');

    return this.ticketService.updateTicketToQaInProgress(id, currentUser);
  }

   @Patch(':id/change-status/ready-for-release')
  markInReadyForRelease(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {

    this.logger.debug('KEEP GOING\n');

    return this.ticketService.updateTicketToReadyForRelease(id, currentUser);
  }

    @Patch(':id/change-status/released')
  markInReleased(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {

    this.logger.debug('KEEP GOING\n');

    return this.ticketService.updateTicketToReleased(id, currentUser);
  }
}