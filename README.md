<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  NestJS · MongoDB · Kafka · Redis · JWT · Swagger
</p>

---

## Table of Contents

- [Overview](#overview)
- [What's Included](#whats-included)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Request Lifecycle](#request-lifecycle)
- [Authentication & Authorization](#authentication--authorization)
- [Creating a Feature Module](#creating-a-feature-module)
- [Database — MongoDB / Mongoose](#database--mongodb--mongoose)
- [Redis — Caching & Locks](#redis--caching--locks)
- [Kafka — Events](#kafka--events)
- [HTTP Clients — External Services](#http-clients--external-services)
- [API Response Format](#api-response-format)
- [Validation & Pipes](#validation--pipes)
- [Logging](#logging)
- [Swagger / API Docs](#swagger--api-docs)
- [Available Scripts](#available-scripts)
- [Further Reading](#further-reading)

---

## Overview

This is a production-ready NestJS template using MongoDB (Mongoose). Clone it, configure your environment variables, and start building feature modules immediately — logging, auth, caching, metrics, and Kafka are already wired up.

**Your work lives in `src/modules/`.** Everything in `src/infrastructure/` and `src/common/` is already set up and globally available.

---

## What's Included

| Feature | Details |
|---|---|
| **Database** | MongoDB via Mongoose |
| **Auth** | JWT validation + role-based access control (RBAC) |
| **Caching / Locks** | Redis via Keyv |
| **Events** | Kafka producer + consumer base class |
| **HTTP Client** | Axios wrapper for calling external services |
| **Logging** | Winston (colorized in dev, JSON in production) |
| **Metrics** | Prometheus — request count + duration |
| **Validation** | `class-validator` with global pipes |
| **API Docs** | Swagger at `/docs` |
| **Config** | Joi-validated environment variables |
| **Security** | Helmet, CORS, compression |

---

## Project Structure

```
src/
├── common/                  # Shared code across all modules
│   ├── decorators/          # @CurrentUser(), @Public(), @Roles()
│   ├── dto/                 # Base DTOs (e.g. PaginationQueryDto)
│   ├── filters/             # HttpExceptionFilter — catches all unhandled errors
│   ├── interceptors/        # LoggingInterceptor, ResponseInterceptor
│   ├── middleware/          # LoggingMiddleware
│   ├── pipes/               # TrimPipe, ParseObjectIdPipe, FileValidationPipe
│   ├── repositories/        # BaseRepository — reusable Mongoose data access layer
│   ├── types/               # ApiResponse, PaginationMeta, ErrorResponse
│   └── utils/               # Filter / sort / pagination query helpers
│
├── config/
│   ├── configuration.ts     # Maps env vars into a typed config object
│   └── env.validation.ts    # Joi schema — app refuses to start if env is wrong
│
├── infrastructure/          # Technical layers — do not edit unless needed
│   ├── auth/                # JWT guard, RBAC, token service
│   ├── clients/             # Typed HTTP clients for external services
│   ├── database/            # Mongoose connection setup
│   ├── http-client/         # Generic Axios HTTP wrapper
│   ├── kafka/               # Kafka producer + consumer infrastructure
│   ├── metrics/             # Prometheus middleware + service
│   └── redis/               # Redis cache, locks, atomic operations
│
└── modules/                 # Your feature modules go here
    ├── user/                # Example — user domain
    ├── business/            # Example — business domain
    └── enrolled-business/   # Example — enrollment domain (admin + user routes)
```

> **Rule of thumb:** business logic → `src/modules/`. Technical concerns (auth, cache, messaging) → `src/infrastructure/`.

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.template .env
# Then fill in your values
```

### 3. Start the app

```bash
npm run start:dev
```

Swagger docs will be available at `http://localhost:<SERVER_PORT>/docs`.

---

## Environment Variables

The app validates all variables on startup via Joi (`src/config/env.validation.ts`). If a required variable is missing or invalid, **the app will refuse to start** and print a clear error.

| Variable | Description |
|---|---|
| `SERVER_PORT` | Port the app listens on |
| `NODE_ENV` | `development` or `production` |
| `SERVICE_NAME` | Used in logs and Kafka client ID |
| `SERVICE_ID` | Optional instance identifier |
| `DATABASE_URL` | MongoDB connection string (e.g. `mongodb://localhost:27017/mydb`) |
| `JWT_SECRET` | Secret used to sign and verify JWTs |
| `JWT_EXPIRES_IN` | Token expiry, default `24h` (e.g. `1h`, `7d`) |
| `REDIS_HOST` | Redis hostname |
| `REDIS_PORT` | Redis port, default `6379` |
| `REDIS_LOGS` | Set to `true` to log Redis operations |
| `KAFKA_CLIENT_ID` | Kafka client identifier |
| `KAFKA_BROKERS` | Comma-separated broker list (e.g. `localhost:9092`) |
| `KAFKA_GROUP_ID` | Kafka consumer group ID |
| `INTERNAL_API_KEY` | API key for internal service-to-service calls |
| `RBAC_ENABLED` | Set to `true` to enable role-based access checks |
| `SWAGGER_ENABLED` | Set to `true` to enable Swagger UI at `/docs`. Default `false` |
| `CORS_ORIGIN` | Allowed CORS origin, default `*` |
| `NOTIFICATION_SERVICE_URL` | URL of the notification microservice |
| `BILLING_SERVICE_URL` | URL of the billing microservice |
| `BUSINESS_SERVICE_URL` | URL of the business microservice |
| `SUBSCRIPTION_SERVICE_URL` | URL of the subscription microservice |

---

## Running the App

```bash
# Development — auto-restarts on file changes
npm run start:dev

# Debug mode — attach a Node debugger
npm run start:debug

# Production
npm run build
npm run start:prod
```

---

## Request Lifecycle

This shows exactly what runs for every incoming HTTP request, and in which order. Understanding this helps you know **where to put your code**.

```
Incoming HTTP Request
        │
        ▼
  LoggingMiddleware        ← logs "→ GET /api/v1/users from 1.2.3.4"
        │
        ▼
  MetricsMiddleware        ← starts a Prometheus timer
        │
        ▼
  TrimPipe                 ← trims whitespace from all string inputs
        │
        ▼
  ValidationPipe           ← validates body / query / params via class-validator
        │                    throws 400 Bad Request if invalid
        ▼
  JwtAuthGuard             ← verifies Bearer token, populates req.user
        │                    throws 401 Unauthorized if missing or invalid
        ▼
  LoggingInterceptor       ← starts duration tracking
        │
        ▼
  ResponseInterceptor      ← will wrap the response on the way out
        │
        ▼
  Controller Handler       ← your code runs here
        │
        ▼
  ResponseInterceptor      ← wraps result: { success: true, data: ... }
        │
        ▼
  LoggingInterceptor       ← logs "200 GET /users [UserController.findAll] 45ms"
        │
        ▼
  HttpExceptionFilter      ← catches any unhandled error, formats it as
        │                    { success: false, message: "...", error: "..." }
        ▼
  MetricsMiddleware        ← records final status + duration in Prometheus
        │
        ▼
     Response
```

---

## Authentication & Authorization

### How it works

Every request (except public routes) passes through `JwtAuthGuard`. It reads the `Authorization: Bearer <token>` header, verifies it against `JWT_SECRET`, and attaches the decoded payload to `req.user`.

### Get the current user in a controller

```typescript
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Get('me')
getProfile(@CurrentUser() user: JwtPayload) {
  return user; // full decoded token payload
}

// Extract a single field:
@Get('me')
getProfile(@CurrentUser('sub') userId: string) {
  return userId;
}
```


---

## Creating a Feature Module

Follow this pattern when adding a new domain (e.g. `product`).

### 1. Create the Mongoose schema

```typescript
// src/modules/product/entities/product.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
```

### 2. Create the repository

Extend `BaseRepository` — you get all common database operations for free.

```typescript
// src/modules/product/product.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Product, ProductDocument } from './entities/product.entity';

@Injectable()
export class ProductRepository extends BaseRepository<ProductDocument> {
  constructor(@InjectModel(Product.name) model: Model<ProductDocument>) {
    super(model);
  }
}
```

### 3. Create the service

```typescript
// src/modules/product/product.service.ts
import { Injectable } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  findAll() {
    return this.productRepository.find({});
  }

  findById(id: string) {
    return this.productRepository.findById({ id });
  }

  create(data: Partial<Product>) {
    return this.productRepository.createOne(data);
  }
}
```

### 4. Create the controller

```typescript
// src/modules/product/product.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParseObjectIdPipe } from '../../common/pipes';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.productService.findById(id);
  }

  @Post()
  create(@Body() body: CreateProductDto) {
    return this.productService.create(body);
  }
}
```

### 5. Wire up the module

```typescript
// src/modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './entities/product.entity';
import { ProductRepository } from './product.repository';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  providers: [ProductRepository, ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
```

### 6. Register in AppModule

```typescript
// src/app.module.ts
import { ProductModule } from './modules/product/product.module';

@Module({
  imports: [
    // ... existing modules
    ProductModule,
  ],
})
export class AppModule {}
```

All routes will be available at `api/v1/products`.

---

## Database — MongoDB / Mongoose

`DatabaseModule` connects using `DATABASE_URL`. It is global — you do not import it in feature modules.

To use a collection in your module, import `MongooseModule.forFeature()` as shown above.

### BaseRepository methods

| Method | Description |
|---|---|
| `findById({ id })` | Find one document by ID. Returns `null` if not found. Excludes soft-deleted. |
| `findOne({ filters })` | Find the first document matching filters. |
| `find({ filters, sort, limit, skip })` | Find all matching documents. |
| `createOne(data)` | Create a single document. |
| `create(data)` | Create one or many documents. |
| `createMany(data[])` | Create multiple documents. |
| `updateByID(id, data)` | Update by ID. Returns the updated document. |
| `updateOne(filters, data)` | Update the first document matching filters. |
| `updateMany(filters, data)` | Update all matching documents. |
| `deleteById(id)` | Hard delete by ID. |
| `softDeleteById(id)` | Soft delete — sets `isDeleted: true`. |
| `softDeleteMany(filters)` | Soft delete all matching. |
| `countDocuments(filters)` | Count matching documents. |
| `exists(filter)` | Returns `true` if at least one document matches. |
| `aggregate(pipeline)` | Run a MongoDB aggregation pipeline. |
| `getAllData(params)` | Paginated list with filter/sort decoding built in. |
| `withTransaction(fn)` | Run a function inside a MongoDB transaction. |

> All read operations automatically exclude soft-deleted documents (`isDeleted: true`).

### Example — paginated list in a controller

```typescript
@Get()
async findAll(@Query() query: PaginationQueryDto) {
  return this.productRepository.getAllData({
    filter: query.filter ?? '{}',
    sortStr: query.sort ?? '-createdAt',
    page: query.page ?? '1',
    length: query.length ?? '10',
    filterableFields: ['name', 'isActive', 'createdAt'],
  });
}
```

See `docs/filter-guide.md` for the full filter/sort/pagination query reference.

---

## Redis — Caching & Locks

`RedisModule` is global. Inject `RedisService` anywhere.

### TTL presets (from `redis.constants.ts`)

```typescript
import { CACHE_TTL, LOCK_TTL } from '../../infrastructure/redis/redis.constants';

CACHE_TTL.SHORT   // 60 seconds
CACHE_TTL.MEDIUM  // 900 seconds (15 min)
CACHE_TTL.LONG    // 3600 seconds (1 hour)
CACHE_TTL.DAY     // 86400 seconds (24 hours)

LOCK_TTL.SHORT    // 5000 ms
LOCK_TTL.MEDIUM   // 30000 ms
LOCK_TTL.LONG     // 120000 ms
```

### Cache operations

```typescript
import { RedisService } from '../../infrastructure/redis';
import { CACHE_TTL } from '../../infrastructure/redis/redis.constants';

// Get
const cached = await this.redis.get<Product>(`product:${id}`);

// Set with TTL
await this.redis.set(`product:${id}`, product, CACHE_TTL.LONG);

// Cache-aside in one call (recommended)
const product = await this.redis.getOrSet(
  `product:${id}`,
  () => this.productRepository.findById({ id }),
  CACHE_TTL.LONG,
);

// Delete
await this.redis.del(`product:${id}`);

// Delete all keys matching a pattern
await this.redis.delByPattern('product:*');

// Check key exists
const exists = await this.redis.has(`product:${id}`);
```

### Distributed locks

Use `withLock` — it acquires the lock, runs your function, and always releases it:

```typescript
const result = await this.redis.withLock(
  `invoice:generate:${userId}`,
  LOCK_TTL.MEDIUM,
  () => this.invoiceService.generate(userId),
);
```

Manual acquire/release (when you need more control):

```typescript
const token = await this.redis.acquireLock(`order:process:${orderId}`, LOCK_TTL.SHORT);
if (!token) throw new ConflictException('Already being processed');

try {
  await this.doWork(orderId);
} finally {
  await this.redis.releaseLock(`order:process:${orderId}`, token);
}
```

### Atomic counters

```typescript
const views = await this.redis.incr(`page:home:views`);
await this.redis.incrBy(`user:${id}:points`, 10);
await this.redis.expire(`session:${token}`, CACHE_TTL.DAY);
const remaining = await this.redis.getTtl(`session:${token}`);
```

---

## Kafka — Events

### Defining an event

Every event must extend `BaseEvent`. Define your event interface inside your feature module:

```typescript
// src/modules/product/events/product-created.event.ts
import { BaseEvent } from '../../../infrastructure/kafka/events/base.event';

export interface ProductCreatedEvent extends BaseEvent {
  type: 'PRODUCT_CREATED';
  productId: string;
  name: string;
  price: number;
}
```

### Publishing an event

Inject `KafkaService` and use `emit()`. Use `createBaseEvent()` to build the base fields:

```typescript
import { KafkaService } from '../../infrastructure/kafka';
import { createBaseEvent } from '../../infrastructure/kafka/events/base.event';
import { ProductCreatedEvent } from './events/product-created.event';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly kafka: KafkaService,
  ) {}

  async create(data: CreateProductDto) {
    const product = await this.productRepository.createOne(data);

    const event: ProductCreatedEvent = {
      ...createBaseEvent('product-service'),
      type: 'PRODUCT_CREATED',
      productId: String(product._id),
      name: product.name,
      price: product.price,
    };

    await this.kafka.emit('product.created', event);

    return product;
  }
}
```

### Consuming events

Extend `KafkaConsumerBase` inside your feature module:

```typescript
// src/modules/product/consumers/product-event.consumer.ts
import { Injectable } from '@nestjs/common';
import { EachMessagePayload } from 'kafkajs';
import { KafkaConsumerBase } from '../../../infrastructure/kafka/consumer/kafka-consumer.base';

@Injectable()
export class ProductEventConsumer extends KafkaConsumerBase {
  protected readonly groupId = 'product-service-group';
  protected readonly topics = ['product.created'];

  protected async handleMessage(payload: EachMessagePayload): Promise<void> {
    const event = JSON.parse(payload.message.value!.toString());
    this.logger.log(`Received event: ${event.type}`);
    // handle the event...
  }
}
```

Register it in your module's `providers` array:

```typescript
providers: [ProductRepository, ProductService, ProductEventConsumer],
```

The consumer connects in the background when the app starts — it does not block startup.

---

## HTTP Clients — External Services

Pre-built typed clients for external microservices are in `src/infrastructure/clients/` and are globally available.

### Using an existing client

```typescript
import { BillingClient } from '../../infrastructure/clients';

@Injectable()
export class ProductService {
  constructor(private readonly billingClient: BillingClient) {}

  async getInvoice(id: string) {
    return this.billingClient.getInvoice(id);
  }
}
```

### Adding a new external service client

1. Create `src/infrastructure/clients/my-service.client.ts` extending `BaseClient`
2. Export it from `src/infrastructure/clients/index.ts`
3. Add it to `ClientsModule` providers and exports

---

## API Response Format

`ResponseInterceptor` automatically wraps all responses. You just return data from your controller.

**Success — plain return:**
```typescript
// Controller returns:
return product;

// Client receives:
{ "success": true, "data": { ... } }
```

**Success — with message:**
```typescript
// Controller returns:
return { success: true, message: 'Product created', data: product };

// Client receives exactly what you returned — no double-wrapping:
{ "success": true, "message": "Product created", "data": { ... } }
```

**Success — with pagination:**

Use `getAllData()` from `BaseRepository` — it returns `{ data, pagination }`. Spread it in your response:

```typescript
@Get()
async findAll(@Query() query: PaginationQueryDto) {
  const result = await this.productRepository.getAllData({
    filter: query.filter ?? '{}',
    sortStr: query.sort ?? '-createdAt',
    page: query.page ?? '1',
    length: query.length ?? '10',
  });

  return {
    success: true,
    message: 'Products retrieved',
    data: result.data,
    pagination: result.pagination,
  };
}
```

```json
{
  "success": true,
  "message": "Products retrieved",
  "data": [ ... ],
  "pagination": {
    "totalItems": 95,
    "totalPages": 5,
    "currentPage": 2,
    "pageSize": 20
  }
}
```

**Error:**
```json
{ "success": false, "message": "Product not found", "error": "Not Found" }
```

> The `/metrics` endpoint is excluded from wrapping — Prometheus expects plain text.

---

## Validation & Pipes

### DTO example

```typescript
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
```

The global `ValidationPipe` will:
- Strip unknown properties (`whitelist: true`)
- Throw `400` if unknown properties are sent (`forbidNonWhitelisted: true`)
- Auto-convert types (e.g. query string `"1"` → number `1`)

`TrimPipe` runs **before** `ValidationPipe` and trims all string fields — `" admin "` becomes `"admin"` before validation.

### Validate MongoDB IDs

Use `ParseObjectIdPipe` on any route param that is a MongoDB ObjectId:

```typescript
@Get(':id')
findOne(@Param('id', ParseObjectIdPipe) id: string) {
  return this.productService.findById(id);
}
```

Returns `400 Bad Request` if the ID format is invalid.

---

## Logging

Logging is handled automatically. For business-level logs, inject the NestJS `Logger` in your service:

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  async create(data: CreateProductDto) {
    this.logger.log(`Creating product: ${data.name}`);
    const product = await this.productRepository.createOne(data);
    this.logger.log(`Product created: ${String(product._id)}`);
    return product;
  }
}
```

- **Development** (`NODE_ENV=development`): colorized, human-readable output
- **Production** (`NODE_ENV=production`): JSON output for log aggregators (Datadog, CloudWatch, etc.)

Prometheus metrics are exposed at `GET /metrics`. See `docs/observability.md` for Grafana dashboards and alerting setup.

---

## Health Check

A health endpoint is available at `GET /health` (root level, no auth required):

```json
{
  "status": "ok",
  "timestamp": "2026-04-07T10:00:00.000Z",
  "uptime": 123.45
}
```

Use this for Docker healthchecks or load balancer probes:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:<PORT>/health || exit 1
```

---

## Graceful Shutdown

`app.enableShutdownHooks()` is enabled in `main.ts`. When the process receives `SIGTERM` (Docker stop, Kubernetes pod restart), NestJS runs `OnModuleDestroy` on all services before exiting.

This means:
- Kafka consumers disconnect and commit offsets cleanly
- MongoDB connections are closed properly
- No in-flight requests are dropped mid-processing

You do not need to configure anything — it works automatically as long as your services implement `OnModuleDestroy`, which `KafkaConsumerBase` and `DatabaseModule` already do.

---

## Swagger / API Docs

Swagger UI is at `/docs` when the app is running. It includes Bearer token authentication.

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Products')
@Controller('products')
export class ProductController {

  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Returns list of products' })
  @Get()
  findAll() { ... }
}
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Start in watch mode (development) |
| `npm run start:debug` | Start with Node debugger |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Run compiled output |
| `npm run lint` | Lint and auto-fix |
| `npm run format` | Format with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |

---

## Further Reading

- [docs/filter-guide.md](docs/filter-guide.md) — Filter, sort, and pagination query parameters
- [docs/observability.md](docs/observability.md) — Logging, Prometheus metrics, Grafana, alerting
- [docs/RELIABILITY_PATTERNS.md](docs/RELIABILITY_PATTERNS.md) — Dead letter queues, circuit breakers, idempotency
- [NestJS Documentation](https://docs.nestjs.com)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
