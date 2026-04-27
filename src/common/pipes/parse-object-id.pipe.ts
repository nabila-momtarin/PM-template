import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Validates that a route / query param is a valid MongoDB ObjectId.
 *
 * Usage:
 *   @Param('id', ParseObjectIdPipe) id: string
 *   @Query('userId', ParseObjectIdPipe) userId: string
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`'${value}' is not a valid ObjectId`);
    }
    return value;
  }
}
