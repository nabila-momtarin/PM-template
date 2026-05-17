import { Get, Logger } from '@nestjs/common';
import { Body, Controller, Post, Query } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { TicketService } from '../service/ticket.service';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { TicketQueryDto } from '../dto/ticket-query.dto';


@Controller('tickets')
export class AdminTicketController {
    constructor(private readonly ticketService: TicketService) { }

    private readonly logger = new Logger(AdminTicketController.name);

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
}