import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class CounterService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async generate(counterName: 'ticketCounter' | 'taskCounter'): Promise<number> {
    const counter = await this.connection.collection<{ _id: string; seq: number }>('counters').findOneAndUpdate(
      { _id: counterName },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true },
    );

    if (!counter) throw new Error(`Counter ${counterName} failed to increment`);

    return counter.seq;
  }
}