import { Delete, Get, Logger, Param, Patch, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { Body, Controller, Post, Query } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { TicketService } from '../service/ticket.service';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { TicketQueryDto } from '../dto/ticket-query.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { UpdateTickeDueDatetDto } from '../dto/update-ticket-due-date-.dto';
import { UpdateTicketQaStatusDto } from '../dto/update-ticket-qa-status.dto';

import { FilesInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from 'src/common/upload/multer-options';

@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  private readonly logger = new Logger(TicketController.name);

  @Post()
  @UseInterceptors(FilesInterceptor('attachments', 5, createMulterOptions('tickets')))
  createTicket(
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.debug('CONTROLLER : admin : createTicket\n');

    return this.ticketService.createTicket(dto, files, currentUser);
  }

  @Get()
  getAllTickets(@Query() query: TicketQueryDto) {
    this.logger.debug('CONTROLLER : admin : getAllTickets\n');

    return this.ticketService.getAllTickets(query);
  }

  
  // ── Status shortcut routes MUST stay before @Get(':ticketId') ──
  @Get('open')
  async getOpenTickets(@Query() query: TicketQueryDto) {
    return this.ticketService.getTicketsByStatus('Open', query);
  }



  @Get('in-progress')
  async getInProgressTickets(@Query() query: TicketQueryDto) {
    return this.ticketService.getTicketsByStatus('In Progress', query);
  }



  @Get('developed')
  async getDevelopedTickets(@Query() query: TicketQueryDto) {
    return this.ticketService.getTicketsByStatus('Developed', query);
  }



  @Get('qa-in-progress')
  async getQaInProgressTickets(@Query() query: TicketQueryDto) {
    return this.ticketService.getTicketsByStatus('QA In Progress', query);
  }



  @Get('ready-for-release')
  async getReadyForReleaseTickets(@Query() query: TicketQueryDto) {
    return this.ticketService.getTicketsByStatus('Ready for Release', query);
  }



  @Get('released')
  async getReleasedTickets(@Query() query: TicketQueryDto) {
    return this.ticketService.getTicketsByStatus('Released', query);
  }



  @Get('closed')
  async getClosedTickets(@Query() query: TicketQueryDto) {
    return this.ticketService.getTicketsByStatus('Closed', query);
  }


  // Keep dynamic route AFTER all static shortcut routes
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
  @UseInterceptors(FilesInterceptor('attachments', 5, createMulterOptions('tickets')))
  upadteTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.debug('CONTROLLER : admin : upadteTicket\n');

    return this.ticketService.updateTicket(id, dto, currentUser, files);
  }

  @Patch(':id/due-date')
  updateTicketDueDate(
    @Param('id') id: string,
    @Body() dto: UpdateTickeDueDatetDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.logger.debug('KEEP GOING\n');

    return this.ticketService.updateTicketDueDate(id, dto, currentUser);
  }

  @Patch(':id/change-qa-status')
  updateTicketQaStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketQaStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
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

  @Patch(':id/change-status/closed')
  markInClosed(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser) {
    this.logger.debug('KEEP GOING\n');

    return this.ticketService.updateTicketToClosed(id, currentUser);
  }
}
