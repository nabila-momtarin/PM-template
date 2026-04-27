import {
  ClientSession,
  DeleteResult,
  Document,
  FilterQuery,
  Model,
  PipelineStage,
  PopulateOptions,
  QueryOptions,
  SortOrder,
  UpdateQuery,
} from 'mongoose';
import {
  filterParamsDecoder,
  getNonFilterableFields,
  queryToPagination,
  resultToPagination,
  sortParamsDecoder,
} from '../utils/params-decoder';

// Simplified type definitions that are compatible with MongoDB driver
type SimpleCollationOptions = {
  locale: string;
  caseLevel?: boolean;
  caseFirst?: string;
  strength?: number;
  numericOrdering?: boolean;
  alternate?: string;
  maxVariable?: string;
  backwards?: boolean;
};

type SimpleReadPreference =
  | 'primary'
  | 'primaryPreferred'
  | 'secondary'
  | 'secondaryPreferred'
  | 'nearest';

// Enhanced interfaces for granular control
interface BaseQueryOptions {
  session?: ClientSession;
  useLean?: boolean;
  select?: string | string[];
  populate?: PopulateOptions | (string | PopulateOptions)[];
  timeout?: number;
  maxTimeMS?: number;
  hint?: string | Record<string, any>;
  comment?: string;
}

interface CreateOptions {
  session?: ClientSession;
  validateBeforeSave?: boolean;
  runValidators?: boolean;
}

interface EnhancedUpdateOptions {
  session?: ClientSession;
  new?: boolean;
  runValidators?: boolean;
  upsert?: boolean;
  setDefaultsOnInsert?: boolean;
  rawResult?: boolean;
  strict?: boolean;
  useLean?: boolean;
}

interface DeleteOptions {
  session?: ClientSession;
  bypassDocumentValidation?: boolean;
  useLean?: boolean;
}

interface CountOptions {
  session?: ClientSession;
  hint?: string | Record<string, any>;
  limit?: number;
  skip?: number;
  maxTimeMS?: number;
}

interface GetAllParams {
  filter: any;
  sortStr: string;
  page: string;
  length: string;
  filterableFields?: string[];
  aggregationPipeline?: PipelineStage[];
  projectStage?: PipelineStage;
  useAggregation?: boolean;
  excludeFields?: string[];
  useLean?: boolean;
  // Enhanced options
  session?: ClientSession;
  allowDiskUse?: boolean;
  maxTimeMS?: number;
  readPreference?: SimpleReadPreference;
  readConcern?: { level: string };
  hint?: string | Record<string, any>;
  collation?: SimpleCollationOptions;
}

interface FindParams {
  filters?: Record<string, any>;
  sort?: Record<string, SortOrder>;
  limit?: number;
  skip?: number;
  populate?: PopulateOptions | (string | PopulateOptions)[];
  useLean?: boolean;
  select?: string | string[];
  // Enhanced options
  session?: ClientSession;
  maxTimeMS?: number;
  hint?: string | Record<string, any>;
  collation?: SimpleCollationOptions;
  batchSize?: number;
  comment?: string;
}

interface FindOneParams extends Omit<FindParams, 'limit' | 'skip'> {
  sort?: Record<string, SortOrder>;
}

interface FindByIdParams extends BaseQueryOptions {
  id: string;
  lean?: boolean; // Keep backward compatibility
}

interface AggregateOptions {
  session?: ClientSession;
  allowDiskUse?: boolean;
  readPreference?: SimpleReadPreference;
  hint?: string | Record<string, any>;
  collation?: SimpleCollationOptions;
}

export type Pagination =
  | {
      totalItems: number;
      totalPages: number;
      currentPage: number;
      pageSize: number;
    }
  | undefined;

export class BaseRepository<T extends Document> {
  protected model: Model<T>;
  private defaultOptions: Partial<BaseQueryOptions>;

  constructor(model: Model<T>, defaultOptions: Partial<BaseQueryOptions> = {}) {
    this.model = model;
    this.defaultOptions = {
      useLean: true,
      timeout: 30000,
      ...defaultOptions,
    };
  }

  // Helper method to merge options with defaults
  private mergeOptions<O extends BaseQueryOptions>(options: O): O {
    return {
      ...this.defaultOptions,
      ...options,
    } as O;
  }

  // Enhanced create method
  async create(data: Partial<T> | Partial<T>[], options: CreateOptions = {}): Promise<T | T[]> {
    const createData = Array.isArray(data) ? data : [data];

    if (options.session) {
      return this.model.create(createData, { session: options.session });
    }

    const result = await this.model.create(createData);
    return Array.isArray(data) ? result : result[0];
  }

  // Single document creation method
  async createOne(data: Partial<T>, options: CreateOptions = {}): Promise<T> {
    if (options.session) {
      const result = await this.model.create([data], {
        session: options.session,
      });
      return result[0];
    }

    return this.model.create(data);
  }

  // Multiple documents creation method
  async createMany(data: Partial<T>[], options: CreateOptions = {}): Promise<T[]> {
    if (options.session) {
      return this.model.create(data, { session: options.session });
    }

    return this.model.create(data);
  }

  // Enhanced findById with more options
  async findById(params: FindByIdParams): Promise<T | null> {
    // Handle backward compatibility for useLean vs lean
    const useLeanValue = params.useLean ?? params.lean ?? true;

    const { id, select, populate, session, maxTimeMS, hint, comment } = this.mergeOptions({
      ...params,
      useLean: useLeanValue,
    });

    // Use findOne instead of findById to add isDeleted filter
    const query = this.model.findOne({
      _id: id,
      isDeleted: { $ne: true },
    } as FilterQuery<T>);

    if (select) {
      const selectFields = Array.isArray(select) ? select.join(' ') : select;
      query.select(selectFields);
    }
    if (populate) query.populate(populate);
    if (session) query.session(session);
    if (maxTimeMS) query.maxTimeMS(maxTimeMS);
    if (hint) query.hint(hint);
    if (comment) query.comment(comment);

    return useLeanValue ? query.lean<T>().exec() : query.exec();
  }

  // Enhanced find method
  async find(params: FindParams = {}): Promise<T[]> {
    const {
      filters = {},
      sort = {},
      limit = 0,
      skip = 0,
      populate,
      useLean,
      select,
      session,
      maxTimeMS,
      hint,
      collation,
      batchSize,
      comment,
    } = this.mergeOptions(params);

    const query = this.model
      .find({ ...filters, isDeleted: { $ne: true } } as FilterQuery<T>)
      .sort(sort);

    if (limit > 0) query.limit(limit);
    if (skip > 0) query.skip(skip);
    if (populate) query.populate(populate);
    if (select) {
      const selectFields = Array.isArray(select) ? select.join(' ') : select;
      query.select(selectFields);
    }
    if (session) query.session(session);
    if (maxTimeMS) query.maxTimeMS(maxTimeMS);
    if (hint) query.hint(hint);
    if (collation) query.collation(collation as any);
    if (batchSize) query.batchSize(batchSize);
    if (comment) query.comment(comment);

    return useLean ? query.lean<T[]>().exec() : query.exec();
  }

  // Enhanced findOne method
  async findOne(params: FindOneParams = {}): Promise<T | null> {
    const {
      filters = {},
      useLean,
      select,
      sort,
      populate,
      session,
      maxTimeMS,
      hint,
      collation,
      comment,
    } = this.mergeOptions(params);

    const query = this.model.findOne({
      ...filters,
      isDeleted: { $ne: true },
    } as FilterQuery<T>);

    if (select) {
      const selectFields = Array.isArray(select) ? select.join(' ') : select;
      query.select(selectFields);
    }
    if (sort) query.sort(sort);
    if (populate) query.populate(populate);
    if (session) query.session(session);
    if (maxTimeMS) query.maxTimeMS(maxTimeMS);
    if (hint) query.hint(hint);
    if (collation) query.collation(collation as any);
    if (comment) query.comment(comment);

    return useLean ? query.lean<T>().exec() : query.exec();
  }

  // Enhanced update methods - UPDATED WITH LEAN SUPPORT
  async updateByID(
    id: string,
    data: UpdateQuery<T>,
    options: EnhancedUpdateOptions = {},
  ): Promise<T | null> {
    // Extract useLean from options
    const { session, useLean, ...mongooseOptions } = options;
    const cleanOptions: QueryOptions = {
      new: true,
      runValidators: true,
      omitUndefined: true,
      ...mongooseOptions,
    };

    // Use findOneAndUpdate instead of findByIdAndUpdate to add isDeleted filter
    const query = this.model.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } } as FilterQuery<T>,
      data,
      cleanOptions,
    );

    if (session) query.session(session);

    // Apply lean if specified
    return useLean ? query.lean<T>().exec() : query.exec();
  }

  async updateOne(
    filters: FilterQuery<T>,
    data: UpdateQuery<T>,
    options: EnhancedUpdateOptions = {},
  ): Promise<T | null> {
    const { session, useLean, ...mongooseOptions } = options;

    const updatedFilters = {
      ...filters,
      isDeleted: { $ne: true },
    } as FilterQuery<T>;

    const queryOptions = {
      runValidators: true,
      new: true, // Return updated document
      omitUndefined: true,
      ...mongooseOptions,
      ...(session && { session }),
    };

    // Use findOneAndUpdate for atomic operation
    const query = this.model.findOneAndUpdate(updatedFilters, data, queryOptions);

    return useLean ? query.lean<T>().exec() : query.exec();
  }

  async updateMany(
    filters: FilterQuery<T>,
    data: UpdateQuery<T>,
    options: EnhancedUpdateOptions = {},
  ): Promise<T[]> {
    // Create clean options for mongoose updateMany
    const { session, useLean, ...mongooseOptions } = options;
    const cleanOptions = {
      runValidators: true,
      new: true,
      omitUndefined: true,
      ...mongooseOptions,
    };

    const updatedFilters = {
      ...filters,
      isDeleted: { $ne: true },
    } as FilterQuery<T>;

    if (session) {
      await this.model.updateMany(updatedFilters, data, cleanOptions).session(session);
      const findQuery = this.model.find(updatedFilters).session(session);
      return useLean ? findQuery.lean<T[]>().exec() : findQuery.exec();
    } else {
      await this.model.updateMany(updatedFilters, data, cleanOptions).exec();
      const findQuery = this.model.find(updatedFilters);
      return useLean ? findQuery.lean<T[]>().exec() : findQuery.exec();
    }
  }

  // Enhanced delete methods with lean support
  async deleteById(
    id: string,
    options: DeleteOptions & { useLean?: boolean } = {},
  ): Promise<T | null> {
    const { session, useLean, ...cleanOptions } = options;

    // Use findOneAndDelete to add isDeleted filter
    const query = this.model.findOneAndDelete(
      {
        _id: id,
        isDeleted: { $ne: true },
      } as FilterQuery<T>,
      cleanOptions,
    );

    if (session) query.session(session);

    // Apply lean if specified
    return useLean ? query.lean<T>().exec() : query.exec();
  }

  async deleteMany(filters: FilterQuery<T>, options: DeleteOptions = {}): Promise<DeleteResult> {
    // Note: deleteMany returns DeleteResult, not documents, so lean doesn't apply here
    const { session, ...cleanOptions } = options;

    // Add isDeleted filter to only delete non-soft-deleted documents
    const updatedFilters = {
      ...filters,
      isDeleted: { $ne: true },
    } as FilterQuery<T>;

    const query = this.model.deleteMany(updatedFilters, cleanOptions);

    if (session) query.session(session);

    return query.exec();
  }
  // Soft delete methods (new feature)
  async softDeleteById(
    id: string,
    options: EnhancedUpdateOptions = {},
    filters: FilterQuery<T> = {},
  ): Promise<T | null> {
    return this.updateByID(id, { isDeleted: true, ...filters } as UpdateQuery<T>, {
      ...options,
      useLean: true,
    });
  }

  async softDeleteMany(filters: FilterQuery<T>, options: EnhancedUpdateOptions = {}): Promise<T[]> {
    return this.updateMany(filters, { isDeleted: true } as UpdateQuery<T>, options);
  }

  // Enhanced count method
  async countDocuments(
    filters: FilterQuery<T> = {} as FilterQuery<T>,
    options: CountOptions = {},
  ): Promise<number> {
    const query = this.model.countDocuments({
      ...filters,
      isDeleted: { $ne: true },
    } as FilterQuery<T>);

    if (options.session) query.session(options.session);
    if (options.hint) query.hint(options.hint);
    if (options.limit) query.limit(options.limit);
    if (options.skip) query.skip(options.skip);
    if (options.maxTimeMS) query.maxTimeMS(options.maxTimeMS);

    return query.exec();
  }

  async findOneAndUpdate(
    filters: FilterQuery<T>,
    data: UpdateQuery<T>,
    options: EnhancedUpdateOptions = {},
  ): Promise<T | null> {
    const mongooseOptions: QueryOptions = {
      new: true,
      runValidators: true,
      omitUndefined: true,
      ...options,
    };

    const updatedFilters = {
      ...filters,
      isDeleted: { $ne: true },
    } as FilterQuery<T>;

    const query = this.model.findOneAndUpdate(updatedFilters, data, mongooseOptions);

    if (options.session) query.session(options.session);

    return options.useLean ? query.lean<T>().exec() : query.exec();
  }

  async findOrCreate(
    filters: FilterQuery<T>,
    data: Partial<T>,
    options: CreateOptions & BaseQueryOptions = {},
  ): Promise<T> {
    const query = this.model.findOne(filters);

    if (options.session) query.session(options.session);

    let document = await query.exec();

    if (!document) {
      const created = await this.create(data, options);
      // Handle the create result properly
      if (Array.isArray(created)) {
        return created[0] as unknown as T;
      } else {
        return created as unknown as T;
      }
    }

    // Return the found document
    return document as unknown as T;
  }

  // Enhanced aggregation with more options
  async aggregate<R = any>(
    pipeline: PipelineStage[],
    options: AggregateOptions = {},
  ): Promise<R[]> {
    const aggregation = this.model.aggregate(pipeline);

    if (options.session) aggregation.session(options.session);
    if (options.allowDiskUse) aggregation.allowDiskUse(options.allowDiskUse);
    if (options.readPreference) aggregation.read(options.readPreference as any);
    if (options.hint) aggregation.hint(options.hint);
    if (options.collation) aggregation.collation(options.collation as any);

    return aggregation.exec();
  }

  // Enhanced getAllData method
  async getAllData(params: GetAllParams): Promise<{ data: T[]; pagination: Pagination }> {
    const DEFAULT_EXCLUDE_FIELDS = ['isDeleted', '__v'];
    const {
      filter,
      page,
      length,
      sortStr = '-createdAt',
      filterableFields = [],
      aggregationPipeline = [],
      projectStage,
      useAggregation = false,
      excludeFields = [],
      useLean = false,
      session,
      allowDiskUse,
      maxTimeMS,
      readPreference,
      readConcern,
      hint,
      collation,
    } = params;

    const filters = filterParamsDecoder(filter);
    const sort = sortParamsDecoder(sortStr);
    const paginationParams = queryToPagination({ page, length });

    const { skip, limit } = paginationParams.request;

    getNonFilterableFields(filters, filterableFields);

    const mergedExcludeFields = Array.from(new Set([...DEFAULT_EXCLUDE_FIELDS, ...excludeFields]));

    const baseFilter = {
      ...filters,
      isDeleted: { $ne: true },
    };

    if (useAggregation) {
      const unsetStage = {
        $unset: mergedExcludeFields,
      };

      // Build the facet pipeline with proper typing
      const dataStages = [
        { $sort: sort || {} },
        { $skip: skip },
        { $limit: limit },
        ...(projectStage ? [projectStage] : []),
        unsetStage,
      ];

      const totalCountStages = [{ $count: 'count' }];

      const facetStage = {
        $facet: {
          data: dataStages,
          totalCount: totalCountStages,
        },
      };

      const pipeline = [...aggregationPipeline, { $match: baseFilter }, facetStage];

      const aggregationOptions: AggregateOptions = {};
      if (session) aggregationOptions.session = session;
      if (allowDiskUse) aggregationOptions.allowDiskUse = allowDiskUse;
      if (readPreference) aggregationOptions.readPreference = readPreference;
      if (hint) aggregationOptions.hint = hint;
      if (collation) aggregationOptions.collation = collation;

      const result = await this.aggregate(pipeline as PipelineStage[], aggregationOptions);

      const data = result[0]?.data || [];
      const totalCount = result[0]?.totalCount[0]?.count || 0;

      const paginationResult = resultToPagination(totalCount, paginationParams);

      return { data, pagination: paginationResult.pagination };
    } else {
      const query = this.model
        .find(baseFilter as FilterQuery<T>)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(mergedExcludeFields.map((f) => `-${f}`).join(' '));

      if (useLean) query.lean();
      if (session) query.session(session);
      if (maxTimeMS) query.maxTimeMS(maxTimeMS);
      if (hint) query.hint(hint);
      if (collation) query.collation(collation as any);

      const countQuery = this.model.countDocuments(baseFilter as FilterQuery<T>);
      if (session) countQuery.session(session);

      const [data, totalCount] = await Promise.all([query.exec(), countQuery.exec()]);

      const paginationResult = resultToPagination(totalCount, paginationParams);

      return { data, pagination: paginationResult.pagination };
    }
  }

  // Utility methods for advanced use cases
  async startSession(): Promise<ClientSession> {
    return this.model.db.startSession();
  }

  async withTransaction<R>(fn: (session: ClientSession) => Promise<R>): Promise<R> {
    const session = await this.startSession();
    try {
      return await session.withTransaction(fn);
    } finally {
      await session.endSession();
    }
  }

  // Method to get model for advanced operations
  getModel(): Model<T> {
    return this.model;
  }

  // Method to set default options globally
  setDefaultOptions(options: Partial<BaseQueryOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const result = await this.model.exists({
      ...filter,
      isDeleted: { $ne: true }, // Ensuring soft-deleted items are excluded
    });

    return !!result;
  }
}
