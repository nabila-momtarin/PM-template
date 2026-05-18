import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TicketRepository } from '../ticket.repository';
import { AuthenticatedUser } from 'src/infrastructure/auth/types/auth.types';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { Ticket, TicketDocument } from '../entities/ticket.schema';
import { HydratedDocument, Types } from 'mongoose';
import { TicketQueryDto } from '../dto/ticket-query.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { UpdateTickeDueDatetDto } from '../dto/update-ticket-due-date-.dto';
import { UpdateTicketQaStatusDto } from '../dto/update-ticket-qa-status.dto';

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
      select: '-__v -isDeleted -updatedAt -deletedAt -deletedBy -dueDate',
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
      message: 'Ticket deleted successfully',
    };
  }

  async updateTicket(ticketId: string, dto: UpdateTicketDto, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    this.logger.log(`ticketId: ${ticketId}`);
    // this.logger.log(dto);

    const existingTicket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
    });

    if (!existingTicket) {
      this.logger.error('Ticket not found');
      throw new NotFoundException('Ticket not found');
    }

    const updatableFields: Partial<UpdateTicketDto> = {
      ...dto,
      // updatedBy: new Types.ObjectId(currentUser.userId)
      updatedBy: currentUser.userId.toString(),
    };

    this.logger.log(updatableFields);

    const updatedTicket = await this.ticketRepository.updateByID(ticketId, updatableFields, {
      useLean: true,
      new: true,
    });

    return {
      success: true,
      message: 'Ticket updated successfully',
      data: updatedTicket,
    };
  }

  async updateTicketDueDate(
    ticketId: string,
    dto: UpdateTickeDueDatetDto,
    currentUser: AuthenticatedUser,
  ) {
    this.logger.log('BE HAPPY');
    this.logger.log(`ticketId: ${ticketId}`);

    const existingTicket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
    });

    if (!existingTicket) {
      this.logger.error('Ticket not found');
      throw new NotFoundException('Ticket not found');
    }

    // check invalid date format
    const newDueDate = new Date(dto.dueDate);
    if (isNaN(newDueDate.getTime())) {
      this.logger.error('Invalid date');
      throw new BadRequestException('Invalid date');
    }

    //check the date is not in the past
    if (newDueDate < new Date()) {
      this.logger.error('Due date cannot be in the past');
      throw new Error('Due date cannot be in the past');
    }

    this.logger.log(newDueDate);

    const updatedTicket = await this.ticketRepository.updateByID(
      ticketId,
      {
        dueDate: newDueDate,
        updatedBy: currentUser.userId.toString(),
      },
      {
        useLean: true,
        new: true,
      },
    );

    return {
      success: true,
      message: 'Ticket due date updated successfully',
      data: updatedTicket,
    };
  }

  async updateTicketQaStatus(
    ticketId: string,
    dto: UpdateTicketQaStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    this.logger.log('BE HAPPY');
    this.logger.log(`ticketId: ${ticketId}`);

    const existingTicket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
    });

    if (!existingTicket) {
      this.logger.error('Ticket not found');
      throw new NotFoundException('Ticket not found');
    }

    const updatedTicketQaStatus = await this.ticketRepository.updateByID(
      ticketId,
      {
        qaStatus: dto.qaStatus,
        updatedBy: currentUser.userId.toString(),
      },
      {
        // useLean: true,
        new: true,
      },
    );

    if (!updatedTicketQaStatus) {
      this.logger.error('Ticket not found or deleted during update');
      throw new NotFoundException('Ticket not found or deleted during update');
    }
    this.logger.log(updatedTicketQaStatus);
    return {
      success: true,
      message: 'Ticket QA status updated successfully',
      data: {
        _id: updatedTicketQaStatus._id,
        ticketNumber: updatedTicketQaStatus.ticketNumber,
        qaStatus: updatedTicketQaStatus.qaStatus,
        updatedAt: updatedTicketQaStatus.updatedAt,
        updatedBy: updatedTicketQaStatus.updatedBy,
      },
    };
  }

  async updateTicketToInProgress(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    this.logger.log(`ticketId: ${ticketId}`);

    const existingTicket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
    });

    if (!existingTicket) {
      this.logger.error('Ticket not found');
      throw new NotFoundException('Ticket not found');
    }

    const updatedTicketInProgress = await this.ticketRepository.updateByID(
      ticketId,
      {
        status: 'In Progress',
        updatedBy: currentUser.userId.toString(),
      },
      {
        useLean: true,
        new: true,
      },
    );

    if (!updatedTicketInProgress) {
      this.logger.error('Ticket not found or deleted during update');
      throw new NotFoundException('Ticket not found or deleted during update');
    }
    this.logger.log(updatedTicketInProgress);
    return {
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        _id: updatedTicketInProgress._id,
        ticketNumber: updatedTicketInProgress.ticketNumber,
        status: updatedTicketInProgress.status,
        updatedAt: updatedTicketInProgress.updatedAt,
        updatedBy: updatedTicketInProgress.updatedBy,
      },
    };
  }

  async updateTicketToDeveloped(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    this.logger.log(`ticketId: ${ticketId}`);

    const existingTicket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
    });

    if (!existingTicket) {
      this.logger.error('Ticket not found');
      throw new NotFoundException('Ticket not found');
    }

    const updatedTicketDeveloped = await this.ticketRepository.updateByID(
      ticketId,
      {
        status: 'Developed',
        updatedBy: currentUser.userId.toString(),
      },
      {
        useLean: true,
        new: true,
      },
    );

    if (!updatedTicketDeveloped) {
      this.logger.error('Ticket not found or deleted during update');
      throw new NotFoundException('Ticket not found or deleted during update');
    }
    this.logger.log(updatedTicketDeveloped);
    return {
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        _id: updatedTicketDeveloped._id,
        ticketNumber: updatedTicketDeveloped.ticketNumber,
        status: updatedTicketDeveloped.status,
        updatedAt: updatedTicketDeveloped.updatedAt,
        updatedBy: updatedTicketDeveloped.updatedBy,
      },
    };
  }

  async updateTicketToQaInProgress(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    this.logger.log(`ticketId: ${ticketId}`);

    const existingTicket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
    });

    if (!existingTicket) {
      this.logger.error('Ticket not found');
      throw new NotFoundException('Ticket not found');
    }

    const updatedTicketQaInProgress = await this.ticketRepository.updateByID(
      ticketId,
      {
        status: 'QA In Progress',
        updatedBy: currentUser.userId.toString(),
      },
      {
        useLean: true,
        new: true,
      },
    );

    if (!updatedTicketQaInProgress) {
      this.logger.error('Ticket not found or deleted during update');
      throw new NotFoundException('Ticket not found or deleted during update');
    }
    this.logger.log(updatedTicketQaInProgress);
    return {
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        _id: updatedTicketQaInProgress._id,
        ticketNumber: updatedTicketQaInProgress.ticketNumber,
        status: updatedTicketQaInProgress.status,
        updatedAt: updatedTicketQaInProgress.updatedAt,
        updatedBy: updatedTicketQaInProgress.updatedBy,
      },
    };
  }

  async updateTicketToReadyForRelease(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    this.logger.log(`ticketId: ${ticketId}`);

    const existingTicket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
    });

    if (!existingTicket) {
      this.logger.error('Ticket not found');
      throw new NotFoundException('Ticket not found');
    }

    const updatedTicketReadyForRelease = await this.ticketRepository.updateByID(
      ticketId,
      {
        status: 'Ready for Release',
        updatedBy: currentUser.userId.toString(),
      },
      {
        useLean: true,
        new: true,
      },
    );

    if (!updatedTicketReadyForRelease) {
      this.logger.error('Ticket not found or deleted during update');
      throw new NotFoundException('Ticket not found or deleted during update');
    }
    this.logger.log(updatedTicketReadyForRelease);
    return {
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        _id: updatedTicketReadyForRelease._id,
        ticketNumber: updatedTicketReadyForRelease.ticketNumber,
        status: updatedTicketReadyForRelease.status,
        updatedAt: updatedTicketReadyForRelease.updatedAt,
        updatedBy: updatedTicketReadyForRelease.updatedBy,
      },
    };
  }

  async updateTicketToReleased(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    this.logger.log(`ticketId: ${ticketId}`);

    const existingTicket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
    });

    if (!existingTicket) {
      this.logger.error('Ticket not found');
      throw new NotFoundException('Ticket not found');
    }

    const updatedTicketReleased = await this.ticketRepository.updateByID(
      ticketId,
      {
        status: 'Released',
        updatedBy: currentUser.userId.toString(),
      },
      {
        useLean: true,
        new: true,
      },
    );

    if (!updatedTicketReleased) {
      this.logger.error('Ticket not found or deleted during update');
      throw new NotFoundException('Ticket not found or deleted during update');
    }
    this.logger.log(updatedTicketReleased);
    return {
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        _id: updatedTicketReleased._id,
        ticketNumber: updatedTicketReleased.ticketNumber,
        status: updatedTicketReleased.status,
        updatedAt: updatedTicketReleased.updatedAt,
        updatedBy: updatedTicketReleased.updatedBy,
      },
    };
  }


  async updateTicketToClosed(ticketId: string, currentUser: AuthenticatedUser) {
    this.logger.log('BE HAPPY');
    this.logger.log(`ticketId: ${ticketId}`);

    const existingTicket = await this.ticketRepository.findById({
      id: ticketId,
      useLean: true,
    });

    if (!existingTicket) {
      this.logger.error('Ticket not found');
      throw new NotFoundException('Ticket not found');
    }

    const updatedTicketClosed = await this.ticketRepository.updateByID(
      ticketId,
      {
        status: 'Closed',
        updatedBy: currentUser.userId.toString(),
      },
      {
        useLean: true,
        new: true,
      },
    );

    if (!updatedTicketClosed) {
      this.logger.error('Ticket not found or deleted during update');
      throw new NotFoundException('Ticket not found or deleted during update');
    }
    this.logger.log(updatedTicketClosed);
    return {
      success: true,
      message: 'Ticket status updated successfully',
      data: {
        _id: updatedTicketClosed._id,
        ticketNumber: updatedTicketClosed.ticketNumber,
        status: updatedTicketClosed.status,
        updatedAt: updatedTicketClosed.updatedAt,
        updatedBy: updatedTicketClosed.updatedBy,
      },
    };
  }

}
