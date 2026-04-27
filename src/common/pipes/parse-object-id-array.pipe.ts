import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Validates that every element in an array is a valid MongoDB ObjectId.
 * Use this for bulk operations (bulk delete, bulk update, etc.)
 *
 * Usage in controller:
 *   @Body('ids', ParseObjectIdArrayPipe) ids: string[]
 *
 * Expects input: ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"]
 */
@Injectable()
export class ParseObjectIdArrayPipe implements PipeTransform<string[], string[]> {
  transform(values: string[]): string[] {
    if (!Array.isArray(values)) {
      throw new BadRequestException('Expected an array of ObjectIds');
    }

    if (values.length === 0) {
      throw new BadRequestException('Array must contain at least one ObjectId');
    }

    const invalid = values.filter((v) => !Types.ObjectId.isValid(v));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid ObjectId(s): ${invalid.join(', ')}`,
      );
    }

    return values;
  }
}
