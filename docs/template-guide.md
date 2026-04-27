# NestJS Template Guide

## Table of Contents
1. [Project Structure](#project-structure)
2. [Environment Setup](#environment-setup)
3. [Creating a Feature Module](#creating-a-feature-module)
4. [Using the Base Repository](#using-the-base-repository)
5. [Redis — Caching & Locks](#redis--caching--locks)
6. [Kafka — Events](#kafka--events)
7. [External Service Clients](#external-service-clients)
8. [API Response Structure](#api-response-structure)
9. [Authentication & Guards](#authentication--guards)
10. [Pipes](#pipes)

---

## Project Structure

```
src/
├── common/                        # NestJS-layer shared code
│   ├── decorators/                # @CurrentUser(), @Public(), @Roles()
│   ├── dto/                       # Base DTOs (PaginationDto, FilterDto)
│   ├── filters/                   # Global exception filter
│   ├── interceptors/              # Response, Logging interceptors
│   ├── middleware/                # HTTP logging middleware
│   ├── pipes/                     # ParseObjectIdPipe, TrimPipe, etc.
│   ├── repositories/              # BaseRepository (Mongoose)
│   ├── types/                     # ApiResponse, ErrorResponse, PaginationMeta
│   └── utils/
│       └── params-decoder.ts      # Filter / sort / pagination decoder
├── config/                        # App configuration (env vars)
├── infrastructure/                # Technical infrastructure modules
│   ├── auth/                      # JWT guard, RBAC, token service
│   ├── clients/                   # External service HTTP clients
│   │   ├── base.client.ts
│   │   ├── billing.client.ts
│   │   └── notification.client.ts
│   ├── database/                  # MongoDB / Mongoose setup
│   ├── http-client/               # Generic HTTP client (Axios wrapper)
│   ├── kafka/                     # Kafka producer, consumer base, events
│   ├── redis/                     # Redis service (cache, locks, atomic ops)
│   └── shared/                    # Pure utilities shared across microservices
└── modules/                       # Feature modules (business logic)
    └── user/                      # Example feature module
        ├── consumers/             # Kafka consumers for this domain
        ├── dto/
        ├── entities/
        ├── interfaces/
        ├── user.controller.ts
        ├── user.module.ts
        ├── user.repository.ts
        └── user.service.ts
```

---

## Environment Setup

Copy `.env.template` to `.env` and fill in the values:

```bash
cp .env.template .env
```

Required variables:
```
PORT=5132
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/your-db
JWT_SECRET=your-secret-minimum-32-characters
KAFKA_CLIENT_ID=your-service-name
KAFKA_BROKERS=localhost:9092
REDIS_HOST=localhost
REDIS_PORT=6379
```

Start the app:
```bash
npm run start:dev
```

Swagger docs available at: `http://localhost:5132/docs`

---

## Creating a Feature Module

Follow the `user` module as a reference. Every feature module follows this pattern:

### 1. Schema (`entities/your-entity.schema.ts`)
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
```

### 2. Repository (`your-entity.repository.ts`)
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Product, ProductDocument } from './entities/product.schema';

@Injectable()
export class ProductRepository extends BaseRepository<ProductDocument> {
  constructor(@InjectModel(Product.name) model: Model<ProductDocument>) {
    super(model);
  }
}
```

### 3. Service (`your-entity.service.ts`)
```typescript
@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: ProductQueryDto) {
    const pagination   = queryToPagination(query);
    const filterQuery  = filterParamsDecoder(query.filter ?? '{}');
    const sort         = sortParamsDecoder(query.sort ?? '');

    const [items, total] = await Promise.all([
      this.productRepository.findAll({ filter: filterQuery, sort, ...pagination.request }),
      this.productRepository.count(filterQuery),
    ]);

    return { items, pagination: resultToPagination(total, pagination).pagination };
  }
}
```

### 4. Controller (`your-entity.controller.ts`)
```typescript
@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Query() query: ProductQueryDto) {
    const { items, pagination } = await this.productService.findAll(query);
    return { success: true, message: 'Products retrieved', data: items, pagination };
  }
}
```

### 5. Module (`your-entity.module.ts`)
```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService],
})
export class ProductModule {}
```

### 6. Register in `app.module.ts`
```typescript
import { ProductModule } from './modules/product/product.module';

// Add to imports array:
ProductModule,
```

---

## Using the Base Repository

`BaseRepository` provides all standard MongoDB operations out of the box:

```typescript
// Find with filter, sort, pagination
const users = await this.userRepository.findAll({
  filter: { isActive: true },
  sort:   { createdAt: -1 },
  skip:   0,
  limit:  10,
});

// Find one
const user = await this.userRepository.findOne({ filter: { email } });

// Find by ID
const user = await this.userRepository.findById({ id });

// Create
const user = await this.userRepository.create(createUserDto);

// Update by ID
const user = await this.userRepository.updateById({ id, data: updateDto });

// Soft delete (sets deletedAt)
await this.userRepository.softDeleteById({ id });

// Hard delete
await this.userRepository.deleteById({ id });

// Count
const total = await this.userRepository.count({ isActive: true });
```

---

## Redis — Caching & Locks

`RedisService` is globally available — inject directly without importing `RedisModule`.

### Cache-aside pattern (most common)
```typescript
const user = await this.redis.getOrSet(
  `user:${id}`,
  () => this.userRepository.findById({ id }),
  CACHE_TTL.MEDIUM, // 15 minutes
);
```

### Invalidate on update
```typescript
await this.redis.del(`user:${id}`);

// Invalidate all keys for a user
await this.redis.delByPattern(`user:${id}:*`);
```

### Distributed lock (prevent duplicate operations)
```typescript
// Option 1: manual
const token = await this.redis.acquireLock(`invoice:${userId}`, LOCK_TTL.SHORT);
if (!token) throw new ConflictException('Operation already in progress');
try {
  await this.generateInvoice(userId);
} finally {
  await this.redis.releaseLock(`invoice:${userId}`, token);
}

// Option 2: withLock (recommended — auto-releases)
const result = await this.redis.withLock(
  `invoice:${userId}`,
  LOCK_TTL.SHORT,
  () => this.generateInvoice(userId),
);
```

### Atomic counters
```typescript
const views = await this.redis.incr(`article:${id}:views`);
await this.redis.expire(`article:${id}:views`, CACHE_TTL.DAY);
```

---

## Kafka — Events

### Producing an event
```typescript
constructor(private readonly kafkaService: KafkaService) {}

await this.kafkaService.emit(KAFKA_TOPICS.USER_CREATED, {
  eventId:   randomUUID(),
  timestamp: new Date().toISOString(),
  version:   '1.0',
  source:    'user-service',
  userId:    user._id,
  email:     user.email,
});
```

### Consuming events
Create a consumer inside the feature module that owns the logic:

```
src/modules/user/consumers/user-created.consumer.ts
```

```typescript
@Injectable()
export class UserCreatedConsumer extends KafkaConsumerBase implements OnModuleInit {
  constructor(private readonly notificationService: NotificationService) {
    super('user-created-group');
  }

  async onModuleInit() {
    await this.subscribe(KAFKA_TOPICS.USER_CREATED, this.handleUserCreated.bind(this));
  }

  private async handleUserCreated(message: UserCreatedEvent) {
    await this.notificationService.sendWelcomeEmail(message.email);
  }
}
```

Register the consumer as a provider in the module — no need to import `KafkaModule`.

### Adding a new topic
1. Add the topic constant to `src/infrastructure/kafka/constants/app.constants.ts`
2. Add the event interface to `src/infrastructure/kafka/events/`
3. Re-export from `src/infrastructure/kafka/events/index.ts`

---

## External Service Clients

All external service clients are globally available — inject directly.

```typescript
constructor(
  private readonly billingClient:      BillingClient,
  private readonly notificationClient: NotificationClient,
) {}

// Call external service
const invoice = await this.billingClient.getInvoice(invoiceId);

await this.notificationClient.sendEmail({
  to:       user.email,
  subject:  'Invoice Ready',
  template: 'invoice-ready',
  data:     { invoiceId },
});
```

### Adding a new external service client
1. Create `src/infrastructure/clients/your-service.client.ts` extending `BaseClient`
2. Add to `ClientsModule` providers and exports
3. Add service URL to `src/config/configuration.ts` under `externalServices`
4. Add env var to `.env.template`

---

## API Response Structure

### Success (list with pagination)
```json
{
  "success": true,
  "message": "Users retrieved",
  "data": [],
  "pagination": {
    "totalItems": 100,
    "totalPages": 10,
    "currentPage": 1,
    "pageSize": 10
  }
}
```

### Success (single item)
```json
{
  "success": true,
  "message": "User found",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "User not found",
  "error": "UserService failed due to: User not found"
}
```

`message` → show in UI.
`error` → use in logs/devtools only.

Controllers return a pre-built response when message or pagination is needed:
```typescript
return { success: true, message: 'User created', data: user };
```

Or return plain data and the `ResponseInterceptor` wraps it automatically:
```typescript
return user;
// becomes → { success: true, data: user }
```

---

## Authentication & Guards

Protect routes with `@UseGuards(JwtAuthGuard)`.

```typescript
// Protect entire controller
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {}

// Get current authenticated user
@Get('me')
getMe(@CurrentUser() user: DecodedToken) {
  return user;
}

// Mark a route as public (skip JWT check)
@Public()
@Get('health')
health() { return 'ok'; }
```

---

## Pipes

| Pipe | Usage |
|---|---|
| `ParseObjectIdPipe` | `@Param('id', ParseObjectIdPipe) id: string` |
| `ParseObjectIdArrayPipe` | `@Body('ids', ParseObjectIdArrayPipe) ids: string[]` |
| `TrimPipe` | Applied globally — all strings trimmed before validation |
| `FileValidationPipe` | `@UploadedFile(new FileValidationPipe({ maxSizeBytes: 2MB }))` |

For full filter/sort/pagination query parameter documentation, see [filter-guide.md](./filter-guide.md).
