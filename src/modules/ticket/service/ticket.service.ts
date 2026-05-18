import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TicketRepository } from '../ticket.repository';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { TicketDocument } from '../entities/ticket.schema';
import { Types } from 'mongoose';
import { TicketQueryDto } from '../dto/ticket-query.dto';

@Injectable()
export class TicketService {
  constructor(private readonly ticketRepository: TicketRepository) { }

  private readonly logger = new Logger(TicketService.name);

  private async generateTicketNumber(): Promise<string> {
    const totalTickets = await this.ticketRepository.countDocuments();

    return `TKT-${totalTickets + 1}`;
  }

  async createTicket(dto: CreateTicketDto, currentUser: AuthenticatedUser) {

    this.logger.log('SERVICE: ticket : createTicket');


    const ticketNumber = await this.generateTicketNumber();
    this.logger.log(`Generated ticket number: ${ticketNumber}`);

    // const ticket = await this.ticketRepository.createOne({
    //     ...dto,
    //     ticketNumber,
    //     createdBy: new Types.ObjectId(currentUser.userId),
    // } /* as any */);

    const ticketPayload: Partial<TicketDocument> = {
      ...dto,
      ticketNumber: ticketNumber,
      createdBy: new Types.ObjectId(currentUser.userId),
      projects: dto.projects?.map((id) => new Types.ObjectId(id)) ?? [],
    };

    const newTicket: any = await this.ticketRepository.createOne(ticketPayload);

    return {
      success: true,
      message: 'Ticket created successfully',
      data: newTicket,
    };
  }


  private buildTicketFilter(query: TicketQueryDto): Record<string, any> {
    const filter: Record<string, any> = {};

    if (query.status) {
      filter.status__eq = query.status;
    }

    if (query.priority) {
      filter.priority__eq = query.priority;
    }

    if (query.ticketType) {
      filter.ticketType__eq = query.ticketType;
    }

    if (query.search) {
      filter.title__like = query.search;
    }

    return filter;
  }

  async getAllTickets(query: TicketQueryDto) {
    this.logger.log('SERVICE: ticket : getAllTickets');

    const filterObj = this.buildTicketFilter(query);

    this.logger.log(`Filter: ${filterObj}`);
    this.logger.log(`Filter: ${JSON.stringify(filterObj)}`);

    const tickets = await this.ticketRepository.getAllData({
      //  filter: query.filter ?? '{}',
      filter: JSON.stringify({ and: filterObj }),
      sortStr: query.sort ?? '-createdAt',
      page: String(query.page ?? 1),
      length: String(query.limit ?? query.length ?? 10),
      filterableFields: [
        'status',
        'priority',
        'ticketType',
        'title',
        'ticketNumber',
        'dueDate',
        'createdAt',
      ],
      useLean: true,
    });

    this.logger.log('tickets: SERVICE: ', tickets);

    return {
      success: true,
      message: 'Tickets fetched successfully',
      data: tickets.data,
      pagination: tickets.pagination,
    };
  }


  async getTicketById(ticketId: string) {
    this.logger.log('SERVICE: ticket : getTicketById');

    const ticket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
      populate: [
        {
          path: 'projects',
          select: 'title',
        },
        {
          path: 'createdBy',
          select: 'name',
        },
      ],
       select: '-__v -isDeleted -updatedAt -deletedAt -deletedBy -dueDate'
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      success: true,
      message: 'Ticket fetched successfully',
      data: ticket,
    };
  }


  async deleteTicket(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('SERVICE: ticket : deleteTicket');

    const deletedTicket = await this.ticketRepository.softDeleteById(
      ticketId,
      {
        useLean: true,
      },
      {
        deletedAt: new Date(),
        deletedBy: new Types.ObjectId(currentUser.userId),
      },
    );

    if (!deletedTicket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      success: true,
      message: 'Ticket deleted successfully'
    };
  }

}