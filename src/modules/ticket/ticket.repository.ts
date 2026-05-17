import { Injectable } from "@nestjs/common";
import { BaseRepository } from "src/common/repositories/base.repository";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import {TicketDocument } from "./entities/ticket.schema";
import { MODEL_NAMES } from "src/common/constants/model-names.constant";



@Injectable()
export class TicketRepository extends BaseRepository <TicketDocument> {
    constructor( @InjectModel(MODEL_NAMES.TICKET) private readonly ticketModel : Model <TicketDocument>) {
        super(ticketModel);
    }

}