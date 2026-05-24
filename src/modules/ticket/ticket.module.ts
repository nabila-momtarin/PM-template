import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {  Ticket, TicketSchema } from './entities/ticket.schema';
import { TicketController } from './controller/ticket.controller';
import { TicketService } from './service/ticket.service';
import { TicketRepository } from './repositroy/ticket.repository';
import { CounterService } from 'src/common/services/counter.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
    ]),
  ],
  controllers: [ TicketController ],
  providers: [ TicketService, TicketRepository,  CounterService ],
  exports: [],
})
export class TicketModule {} 