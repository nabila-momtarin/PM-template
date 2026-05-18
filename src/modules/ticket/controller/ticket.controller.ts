import { Delete, Get, Logger, Param, Patch } from '@nestjs/common';
import { Body, Controller, Post, Query } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { TicketService } from '../service/ticket.service';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { TicketQueryDto } from '../dto/ticket-query.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';


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

}