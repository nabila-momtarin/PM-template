import { BadRequestException } from '@nestjs/common';
import { isValidObjectId, Types } from 'mongoose';

export type PaginationData = {
  request: {
    skip: number;
    limit: number;
  };
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
};

/**
 * Converts filter string to a Mongoose-compatible query object.
 *
 * Operators (used as field__operator in the filter JSON):
 *   Basic       : eq, ne / neq, in, nin / notIn
 *   Comparison  : gt, lt, gte, lte, between
 *   String      : like / contains / ilike, startsWith, endsWith, notContains,
 *                 exactContains, exactStartsWith, exactEndsWith, regex, search
 *   Date        : day, month, year, before, after, dateRange
 *   Array       : has, hasSome, hasEvery, isEmpty
 *   Null        : isNull, isNotNull
 *   Boolean     : isTrue, isFalse
 *   Embedded    : jsonContains, jsonHas
 *
 * Logical groups (top-level keys in the JSON):
 *   and  → $and   |  or → $or   |  not → $nor
 *
 * Examples:
 *   filter={"and":{"status__eq":"active","age__gte":18}}
 *   filter={"and":{"createdAt__dateRange":["2025-01-01","2025-12-31"]}}
 *   filter={"or":[{"role__eq":"admin"},{"role__eq":"editor"}]}
 *   filter={"and":{"name__startsWith":"John"},"not":{"isDeleted__isTrue":true}}
 */
export function filterParamsDecoder(filters: string): Record<string, any> {
  try {
    if (!filters || filters === '{}') return {};

    const decoded = JSON.parse(filters.replace(/'/g, '"'));

    const STRING_OPS = [
      'like',
      'ilike',
      'contains',
      'startsWith',
      'endsWith',
      'regex',
      'search',
      'exactContains',
      'exactStartsWith',
      'exactEndsWith',
      'notContains',
    ];

    const parseValue = (value: any, operator: string): any => {
      if (STRING_OPS.includes(operator)) {
        if (isValidObjectId(value)) {
          return new Types.ObjectId(value);
        }

        return value;
      }

      if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
        return value.toLowerCase() === 'true';
      }

      if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
        return Number(value);
      }

      if (isValidObjectId(value)) {
        return new Types.ObjectId(value);
      }

      return value;
    };

    const buildCondition = (field: string, op: string, rawValue: any): Record<string, any> => {
      const value = parseValue(rawValue, op);

      switch (op) {
        // ── Basic ──────────────────────────────────────────────────────────
        case 'eq':
          return { [field]: value };

        case 'ne':
        case 'neq':
          return { [field]: { $ne: value } };

        case 'in': {
          const vals = Array.isArray(rawValue) ? rawValue : [rawValue];
          return { [field]: { $in: vals } };
        }

        case 'nin':
        case 'notIn': {
          const vals = Array.isArray(rawValue) ? rawValue : [rawValue];
          return { [field]: { $nin: vals } };
        }

        // ── Comparison ─────────────────────────────────────────────────────
        case 'gt':
          return { [field]: { $gt: value } };

        case 'lt':
          return { [field]: { $lt: value } };

        case 'gte':
          return { [field]: { $gte: value } };

        case 'lte':
          return { [field]: { $lte: value } };

        case 'between': {
          if (!Array.isArray(rawValue) || rawValue.length !== 2) {
            throw new BadRequestException(`'between' requires array [min, max]`);
          }
          return {
            [field]: { $gte: parseValue(rawValue[0], 'gte'), $lte: parseValue(rawValue[1], 'lte') },
          };
        }

        // ── String ─────────────────────────────────────────────────────────
        case 'like':
        case 'contains':
        case 'ilike':
          return { [field]: { $regex: rawValue, $options: 'i' } };

        case 'exactContains':
          return { [field]: { $regex: rawValue } };

        case 'startsWith':
          return { [field]: { $regex: `^${rawValue}`, $options: 'i' } };

        case 'exactStartsWith':
          return { [field]: { $regex: `^${rawValue}` } };

        case 'endsWith':
          return { [field]: { $regex: `${rawValue}$`, $options: 'i' } };

        case 'exactEndsWith':
          return { [field]: { $regex: `${rawValue}$` } };

        case 'notContains':
          return { [field]: { $not: { $regex: rawValue, $options: 'i' } } };

        case 'regex':
          return { [field]: { $regex: rawValue } };

        case 'search':
          // Basic regex search; for full-text use MongoDB $text index
          return { [field]: { $regex: rawValue, $options: 'i' } };

        // ── Null ───────────────────────────────────────────────────────────
        case 'isNull':
          return { [field]: null };

        case 'isNotNull':
          return { [field]: { $ne: null } };

        // ── Boolean ────────────────────────────────────────────────────────
        case 'isTrue':
          return { [field]: true };

        case 'isFalse':
          return { [field]: false };

        // ── Array ──────────────────────────────────────────────────────────
        case 'has':
          // Array field contains a specific primitive value
          return { [field]: rawValue };

        case 'hasSome': {
          const vals = Array.isArray(rawValue) ? rawValue : [rawValue];
          return { [field]: { $in: vals } };
        }

        case 'hasEvery': {
          const vals = Array.isArray(rawValue) ? rawValue : [rawValue];
          return { [field]: { $all: vals } };
        }

        case 'isEmpty':
          return { [field]: { $size: 0 } };

        // ── Date ───────────────────────────────────────────────────────────
        case 'day': {
          const d = new Date(rawValue);
          const start = new Date(d);
          start.setHours(0, 0, 0, 0);
          const end = new Date(d);
          end.setHours(23, 59, 59, 999);
          return { [field]: { $gte: start, $lte: end } };
        }

        case 'month': {
          const d = new Date(rawValue);
          const start = new Date(d.getFullYear(), d.getMonth(), 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
          return { [field]: { $gte: start, $lte: end } };
        }

        case 'year': {
          const d = new Date(rawValue);
          const start = new Date(d.getFullYear(), 0, 1);
          const end = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
          return { [field]: { $gte: start, $lte: end } };
        }

        case 'before':
          return { [field]: { $lt: new Date(rawValue) } };

        case 'after':
          return { [field]: { $gt: new Date(rawValue) } };

        case 'dateRange': {
          if (!Array.isArray(rawValue) || rawValue.length !== 2) {
            throw new BadRequestException(`'dateRange' requires array [startDate, endDate]`);
          }
          const start = new Date(rawValue[0]);
          const end = new Date(rawValue[1]);
          end.setHours(23, 59, 59, 999);
          return { [field]: { $gte: start, $lte: end } };
        }

        // ── Embedded doc / JSON ────────────────────────────────────────────
        case 'jsonContains':
          // Array field whose elements match a partial object
          return { [field]: { $elemMatch: rawValue } };

        case 'jsonHas':
          // Check that a nested key exists: field.nestedKey
          return { [`${field}.${rawValue}`]: { $exists: true } };

        default:
          return { [field]: value };
      }
    };

    const buildGroup = (group: Record<string, any> | any[]): Record<string, any>[] => {
      const parts: Record<string, any>[] = [];

      if (Array.isArray(group)) {
        for (const item of group) {
          for (const rawKey in item) {
            const [field, op = 'eq'] = rawKey.split('__');
            parts.push(buildCondition(field, op, item[rawKey]));
          }
        }
      } else {
        for (const rawKey in group) {
          const [field, op = 'eq'] = rawKey.split('__');
          parts.push(buildCondition(field, op, group[rawKey]));
        }
      }

      return parts;
    };

    const andConditions = buildGroup(decoded.and || {});
    const orConditions = buildGroup(decoded.or || []);
    const notConditions = decoded.not ? buildGroup(decoded.not) : [];

    const query: Record<string, any> = {};
    if (andConditions.length > 0) query.$and = andConditions;
    if (orConditions.length > 0) query.$or = orConditions;
    if (notConditions.length > 0) query.$nor = notConditions;

    return query;
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
    throw new BadRequestException(
      `Invalid filter format: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

/**
 * Extracts the value of a specific field from the raw filter string.
 * Searches through all and/or/not groups recursively.
 * Supports dot-notation and any operator suffix, e.g. businessId__eq, roles.businessId__like
 */
export const extractFieldValue = (
  filter: string | null | undefined,
  fieldName: string,
): string | null => {
  if (!filter) return null;

  const filterObj = JSON.parse(filter.replace(/'/g, '"'));
  let found: string | null = null;

  const search = (obj: any): void => {
    if (!obj || typeof obj !== 'object' || found !== null) return;

    if (Array.isArray(obj)) {
      obj.forEach(search);
      return;
    }

    for (const [key, val] of Object.entries(obj)) {
      const keyBase = key.split('__')[0];
      if (keyBase === fieldName || keyBase.endsWith(`.${fieldName}`)) {
        found = val as string;
        return;
      }
      search(val);
    }
  };

  search(filterObj);
  return found;
};

/**
 * Converts sort string to a Mongoose-compatible sort object { field: 1 | -1 }.
 *
 * Supported formats (comma-separated or JSON array):
 *   field:asc | field:desc   →  { field: 1 }  |  { field: -1 }
 *   +field    | -field       →  { field: 1 }  |  { field: -1 }
 *   field                    →  { field: 1 }   (default asc)
 *
 * Examples:
 *   sort=createdAt:desc,name:asc
 *   sort=["-createdAt","+name"]
 */
export function sortParamsDecoder(sort: string): Record<string, 1 | -1> | undefined {
  try {
    if (!sort || sort.length === 0) return undefined;

    const items: string[] = sort.startsWith('[')
      ? JSON.parse(sort.replace(/'/g, '"'))
      : sort.split(',');

    const result: Record<string, 1 | -1> = {};

    for (const item of items) {
      const trimmed = item.trim();
      if (!trimmed) continue;

      if (trimmed.includes(':')) {
        const [field, dir] = trimmed.split(':');
        result[field.trim()] = dir.trim().toLowerCase() === 'desc' ? -1 : 1;
      } else if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
        result[trimmed.slice(1)] = trimmed.startsWith('+') ? 1 : -1;
      } else {
        result[trimmed] = 1;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  } catch {
    throw new BadRequestException('Bad sort format');
  }
}

/**
 * Validates that every field in the decoded filter object is in the allowed list.
 * Throws BadRequestException if non-filterable fields are found.
 */
export function getNonFilterableFields(
  filters: Record<string, any>,
  allowedFields: string[],
): void {
  if (!filters || allowedFields.length === 0) return;

  const LOGICAL_OPS = ['$and', '$or', '$nor', '$not'];
  const bad: string[] = [];

  const check = (obj: any): void => {
    for (const key of Object.keys(obj)) {
      if (LOGICAL_OPS.includes(key)) {
        const nested = obj[key];
        if (Array.isArray(nested)) nested.forEach(check);
        else check(nested);
      } else if (!key.startsWith('$') && !allowedFields.includes(key)) {
        bad.push(key);
      }
    }
  };

  check(filters);

  if (bad.length > 0) {
    throw new BadRequestException(
      bad.length === 1
        ? `Field is not filterable: ${bad[0]}`
        : `Fields are not filterable: ${bad.join(', ')}`,
    );
  }
}

/**
 * Converts page / length query params into skip / limit values.
 * Default: page=1, length=10
 */
export const queryToPagination = (query: {
  page?: string | number;
  length?: string | number;
}): PaginationData => {
  const page = Math.max(1, parseInt(String(query.page ?? 1), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(query.length ?? 10), 10) || 10);

  return {
    request: { skip: (page - 1) * pageSize, limit: pageSize },
  };
};

/**
 * Attaches pagination metadata to a PaginationData object.
 */
export const resultToPagination = (
  totalItems: number,
  pagination: PaginationData,
): PaginationData => {
  const { skip, limit } = pagination.request;
  const pageSize = limit || 10;
  const currentPage = Math.floor(skip / pageSize) + 1;

  pagination.pagination = {
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
    currentPage,
    pageSize,
  };

  return pagination;
};

/**
 * Builds a nested Mongoose query path.
 * buildNestedQuery(['user', 'profile', 'name'], 'John')
 * → { user: { profile: { name: 'John' } } }
 */
export function buildNestedQuery(path: string[], value: any): Record<string, any> {
  if (path.length === 0) return value;
  const [first, ...rest] = path;
  return { [first]: buildNestedQuery(rest, value) };
}

/**
 * Merges multiple Mongoose where-clause objects with $and.
 */
export function mergeWhereClause(...clauses: Record<string, any>[]): Record<string, any> {
  const nonEmpty = clauses.filter((c) => c && Object.keys(c).length > 0);
  if (nonEmpty.length === 0) return {};
  if (nonEmpty.length === 1) return nonEmpty[0];
  return { $and: nonEmpty };
}

/**
 * Merges extra AND conditions into an existing filter string.
 *
 * @example
 * mergeAndFilter(query.filter, { businessId__in: ['id1', 'id2'] })
 */
export function mergeAndFilter(filter: string | undefined, extra: Record<string, any>): string {
  const existing = filter ? (JSON.parse(filter)?.and ?? {}) : {};
  return JSON.stringify({ and: { ...existing, ...extra } });
}

/**
 * Extracts the value of a specific field from the AND clause of a filter string.
 * Matches by base field name — operator suffix (__in, __eq, etc.) is ignored.
 *
 * @example
 * extractFromFilter('{"and":{"businessId__in":["id1"]}}', 'businessId') // => ['id1']
 * extractFromFilter('{"and":{"status__eq":"ACTIVE"}}', 'status')        // => 'ACTIVE'
 */
export function extractFromFilter(filter: string | undefined, field: string): any {
  if (!filter) return undefined;
  const and = JSON.parse(filter)?.and ?? {};
  const key = Object.keys(and).find((k) => k === field || k.startsWith(`${field}__`));
  return key ? and[key] : undefined;
}
