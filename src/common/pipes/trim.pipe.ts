import { Injectable, PipeTransform } from '@nestjs/common';

/**
 * Recursively trims all string values in the incoming request body / query.
 * Prevents dirty data like "  admin " being stored in the database.
 *
 * Registered globally in main.ts via ValidationPipe's transform,
 * but can also be applied per-route when fine-grained control is needed.
 *
 * Usage (per route):
 *   @Body(TrimPipe) body: CreateUserDto
 *
 * Usage (global — add to ValidationPipe chain in main.ts):
 *   app.useGlobalPipes(new TrimPipe(), new ValidationPipe({ ... }))
 *   Note: TrimPipe must come BEFORE ValidationPipe so strings are clean before validation.
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown): unknown {
    return this.trimDeep(value);
  }

  private trimDeep(value: unknown): unknown {
    if (typeof value === 'string') return value.trim();

    if (Array.isArray(value)) return value.map((item) => this.trimDeep(item));

    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, this.trimDeep(v)]),
      );
    }

    return value;
  }
}


//Request body/query string এর extra space trim করতে পারে.