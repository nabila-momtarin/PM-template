import { Injectable } from "@nestjs/common";
import { BaseRepository } from "src/common/repositories/base.repository";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Ticket, TicketDocument } from "./entities/ticket.schema";



@Injectable()
export class TicketRepository extends BaseRepository<TicketDocument> {
    constructor(@InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>) {
        console.log("TICKET MODEL: ", ticketModel);

        super(ticketModel);
    }

}