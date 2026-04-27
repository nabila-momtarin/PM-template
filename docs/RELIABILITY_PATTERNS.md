# Reliability Patterns for NestJS Microservices

> This document explains 4 critical reliability patterns for production microservices.
> Each section covers: what the problem is, a real scenario, and exactly what needs to be implemented.

---

## Table of Contents

1. [Kafka Dead Letter Queue (DLQ)](#1-kafka-dead-letter-queue-dlq)
2. [Circuit Breaker](#2-circuit-breaker)
3. [Outbox Pattern](#3-outbox-pattern)
4. [Idempotency Key](#4-idempotency-key)

---

## 1. Kafka Dead Letter Queue (DLQ)

### What is the Problem?

When a Kafka consumer fails to process a message, one of two bad things happens:

- **Silent data loss** — the message is skipped and gone forever
- **Infinite retry loop** — the same broken message blocks all future messages

### Current State of This Codebase

In `src/infrastructure/kafka/consumer/kafka-consumer.base.ts`, the error handler looks like this:

```typescript
try {
  await this.handleMessage(payload);
} catch (error) {
  this.logger.error(...); // just logs. nothing else.
}
```

KafkaJS defaults to `autoCommit: true`. This means even when `handleMessage()` throws an error,
the offset is committed automatically. The message is marked as "processed" by Kafka —
and it is **permanently lost**. No retry. No record. Just gone.

### Real Scenario

Your system uses Kafka topic `billing.bill-generated`. When a bill is generated,
the consumer is supposed to send an invoice email to the customer.

```
Timeline:

09:00 — Bill generated for Customer A → message published to Kafka
09:00 — Consumer receives message → tries to call NotificationService
09:00 — NotificationService is temporarily down → handleMessage() throws error
09:00 — Error is logged → offset auto-committed → message gone
09:05 — NotificationService recovers
Result: Customer A never receives their invoice. No one knows.
```

This happens silently. No alert. No retry. No record of the failure.

### What is a DLQ?

A Dead Letter Queue is just another Kafka topic (e.g., `billing.bill-generated.dlq`).
When a message fails after N retry attempts, it is published to the DLQ topic instead of being lost.

```
Normal flow:
  Kafka Topic → Consumer → handleMessage() ✅ → commit offset → done

With DLQ:
  Kafka Topic → Consumer → handleMessage() ❌
                               ↓ retry 1 ... ❌
                               ↓ retry 2 ... ❌
                               ↓ retry 3 ... ❌
                               ↓ publish to "billing.bill-generated.dlq"
                               ↓ commit offset → continue with next messages ✅
```

Messages in the DLQ can be:
- Inspected by a developer to understand why they failed
- Replayed manually after the root cause is fixed
- Monitored and alerted on (e.g., alert if DLQ grows)

### What Needs to Be Implemented

**In `KafkaConsumerBase`:**

- Add a `maxRetries` property (e.g., default 3)
- Wrap `handleMessage()` in a retry loop with exponential backoff
- After all retries exhausted, publish the original message to `{originalTopic}.dlq`
- Then commit the offset and move on

**New Kafka topic naming convention:**
```
Original topic:   billing.bill-generated
DLQ topic:        billing.bill-generated.dlq
```

**Add to `KAFKA_TOPICS` constants:**
```
billing.bill-generated.dlq
user.created.dlq
user.updated.dlq
user.deleted.dlq
... (one DLQ per topic)
```

**Concrete consumers** (that extend `KafkaConsumerBase`) get retry behavior for free
because it lives in the base class. No changes needed in feature modules.

---

## 2. Circuit Breaker

### What is the Problem?

Your service calls external services (BillingService, NotificationService, etc.) over HTTP.
If one of those services goes down, your HTTP client retries — which means each request
hangs for up to 2–3 minutes before failing. Under load, this fills up all available
threads and your service crashes too, even though your own code is perfectly fine.

This is called a **cascading failure**: one service going down takes down everything that
depends on it.

### Current State of This Codebase

In `src/infrastructure/http-client/http-client.service.ts`, there is retry logic:

```
Request → External Service (DOWN) → timeout (30s) → retry 1 (30s) → retry 2 (30s) → retry 3 (30s)
Total wait per request: ~2 minutes
```

With 100 concurrent users, that is 100 requests × 2 minutes each = server runs out of resources.

### Real Scenario

```
Timeline:

10:00 — BillingService goes down (deployment, crash, network issue)
10:00 — Users start hitting POST /api/v1/invoices on your service
10:00 — Each request calls BillingService → times out after 30s → retries 3 times
10:02 — Server thread pool exhausted
10:02 — Your service starts returning 503 to ALL requests (not just billing-related)
10:02 — Now your service is also down
10:05 — BillingService recovers, but your service is still overloaded
Result: 5 minutes of full outage caused by a dependency
```

### What is a Circuit Breaker?

A circuit breaker wraps external calls and monitors failure rate.
When failures exceed a threshold, the circuit "trips open" — future calls instantly
return an error without even trying. After a cooldown, it tests one request to see
if the service recovered.

```
States:

CLOSED (normal)
  → All requests flow through to external service
  → Failures are counted

OPEN (tripped)
  → Requests instantly fail with a clear error: "BillingService unavailable"
  → No waiting. No retries. No resource drain.
  → Cooldown timer starts (e.g., 30 seconds)

HALF-OPEN (testing)
  → One test request is allowed through
  → If it succeeds → circuit CLOSES → back to normal
  → If it fails → circuit OPENS again → cooldown resets
```

```
Same timeline with circuit breaker:

10:00 — BillingService goes down
10:00 — First 5 requests fail → circuit OPENS
10:00 — Remaining 95 requests instantly get: { success: false, message: "BillingService unavailable" }
        Total wait: milliseconds, not minutes
10:00 — Your service stays healthy and serves all other endpoints normally
10:30 — Circuit goes HALF-OPEN → test request succeeds → circuit CLOSES
10:30 — Everything back to normal
Result: Zero cascading failure. Only billing endpoints were affected.
```

### What Needs to Be Implemented

**Library:** `opossum` (most popular Node.js circuit breaker)

**In `HttpClientService`:**
- Wrap the axios call with a circuit breaker instance
- Configure: failure threshold (e.g., 50%), cooldown timeout (e.g., 30s), request timeout

**In `BaseClient`:**
- Each concrete client (`BillingClient`, `NotificationClient`) gets its own circuit breaker instance
- This way, BillingService being down does not affect NotificationService's circuit

**Response when circuit is open:**
```json
{
  "success": false,
  "message": "BillingService is temporarily unavailable. Please try again later."
}
```

**Optional but recommended:**
- Expose circuit state via `/health` endpoint so ops teams can see which circuits are open
- Emit a metric/log when a circuit opens so you get alerted

---

## 3. Outbox Pattern

### What is the Problem?

When you save data to MongoDB and then publish an event to Kafka, these are two separate
operations. There is a window between them where your app can crash. If it does, the DB
write is committed but the Kafka event is never published. Other services that depend on
that event never know something happened.

### Current State of This Codebase

A typical service method looks like:

```typescript
async create(dto: CreateUserDto) {
  const user = await this.userRepository.createOne(dto);  // Step 1: DB write ✅
  await this.kafkaService.emit('user.created', { ...user }); // Step 2: Kafka publish ← crash here?
  return user;
}
```

If the app crashes, runs out of memory, or restarts (deployment) between Step 1 and Step 2:
- User exists in the database ✅
- `user.created` event never published ❌
- NotificationService never sends the welcome email
- BillingService never creates the billing account
- Data is silently inconsistent across services

### Real Scenario

```
Timeline:

14:00 — New user registers → UserService.create() is called
14:00 — User saved to MongoDB ✅
14:00 — Kubernetes rolling deployment starts → pod is killed
14:00 — kafkaService.emit() never executes
14:00 — New pod starts up
Result:
  - User can log in (they exist in DB)
  - They never receive a welcome email
  - Their billing account was never created
  - If they try to subscribe to a plan, it fails because billing has no record of them
```

This is very hard to debug because everything looks correct from the user service's perspective.

### What is the Outbox Pattern?

Instead of publishing to Kafka directly, you write a record to an `outbox` collection in MongoDB
**in the same operation** as your main write. A separate background process reads from the outbox
and publishes to Kafka, then marks records as published.

```
Without outbox:
  UserService → MongoDB (user) ✅
  UserService → Kafka (user.created) ← can fail/crash here

With outbox:
  UserService → MongoDB transaction:
    - Insert into "users" collection ✅
    - Insert into "outbox" collection { topic, payload } ✅
    Both succeed or both fail. Atomic.

  Outbox Publisher (background process):
    - Reads unpublished records from "outbox"
    - Publishes each to Kafka ✅
    - Marks record as published ✅
```

Because both the user insert and the outbox insert are in the **same MongoDB transaction**,
they either both succeed or both fail. The event record is never lost.

### Why Not Polling? — Use MongoDB Change Streams

A naive outbox publisher polls the DB every few seconds (`SELECT * FROM outbox WHERE published = false`).
This works but wastes DB reads and costs money on pay-as-you-go cloud databases.

**Better approach: MongoDB Change Streams**

Change Streams are a MongoDB feature that lets your app **subscribe** to changes in a collection.
Instead of asking "are there new records?" every 5 seconds, MongoDB tells your app the instant
a new outbox record is inserted.

```
Polling (wasteful):
  Publisher → query DB every 5s → "anything new?" → most of the time: no
  = Constant DB reads. Costs money. Latency up to 5s.

Change Streams (reactive):
  Publisher → subscribes to outbox collection once
  MongoDB → instantly notifies publisher when new record inserted
  Publisher → publishes to Kafka immediately
  = Zero polling reads. Near-zero latency. No extra DB cost.
```

**Requirement:** MongoDB Change Streams require a **Replica Set**. MongoDB Atlas clusters
are replica sets by default. For local dev, run MongoDB as a single-node replica set.

### What Needs to Be Implemented

**New module: `OutboxModule`**

Files to create:
```
src/infrastructure/outbox/
├── outbox.schema.ts         ← MongoDB schema: topic, payload, publishedAt, status
├── outbox.repository.ts     ← extend BaseRepository
├── outbox.publisher.ts      ← Change Stream subscriber → Kafka publisher
└── outbox.module.ts
```

**Outbox schema fields:**
```
topic        — Kafka topic name (e.g., "user.created")
payload      — serialized event data
status       — "pending" | "published" | "failed"
createdAt    — when the record was inserted
publishedAt  — when it was successfully published
retries      — how many publish attempts were made
```

**Modify `KafkaService.emit()`:**
- Instead of publishing directly to Kafka, write to the outbox collection
- The actual Kafka publish is handled by the publisher

**Modify service methods that emit events:**
- Wrap DB write + outbox insert in a MongoDB session (transaction)

---

## 4. Idempotency Key

### What is the Problem?

Networks are unreliable. Mobile clients lose signal. Load balancers time out. Users
double-tap. When a client does not receive a response, it does not know if the request
succeeded or failed — so it retries. Without idempotency, that retry creates a duplicate.

For most GET requests this does not matter. But for **state-changing operations** it is critical:
- Creating a payment → duplicate means charged twice
- Creating an order → duplicate means two orders shipped
- Creating a user → duplicate means two accounts

### Real Scenario

```
Timeline:

User taps "Place Order" on mobile app:

  11:00:00 — App sends POST /api/v1/orders { items: [...], total: $150 }
  11:00:01 — Server processes order → order created in DB → Kafka event published
  11:00:01 — Server sends response... network drops ❌ client never receives it
  11:00:03 — App shows spinner, times out, user sees "something went wrong"
  11:00:04 — App retries: POST /api/v1/orders { items: [...], total: $150 }
  11:00:04 — Server processes again → second order created → customer charged $150 again

Result: Customer charged $300. Two orders shipped. Support ticket. Refund. Lost trust.
```

This is not a bug in your code. Your code is correct. The problem is the **distributed
nature** of the system — the response was lost in transit.

### What is an Idempotency Key?

The client generates a unique ID (UUID) for each **logical action** before sending the request.
It attaches it as a header. Your server uses this ID to detect and deduplicate retries.

```
Client behavior:
  - Before sending, generate: idempotencyKey = uuid()  → "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  - Send with header: Idempotency-Key: f47ac10b-...
  - If retry needed, send the EXACT SAME key with the EXACT SAME request

Server behavior:
  - Check Redis: "Have I seen key f47ac10b-... before?"
  - NO  → process normally → store response in Redis under that key → return response
  - YES → return the stored response immediately → do not process again
```

```
Same timeline with idempotency:

  11:00:00 — App generates key: "f47ac10b-..."
  11:00:00 — App sends POST /api/v1/orders
             Idempotency-Key: f47ac10b-...
  11:00:01 — Server: key not in Redis → processes order → stores response in Redis
  11:00:01 — Network drops ❌
  11:00:04 — App retries POST /api/v1/orders
             Idempotency-Key: f47ac10b-...   ← same key
  11:00:04 — Server: key found in Redis → returns stored response immediately
             Order is NOT created again

Result: One order. One charge. Customer happy.
```

### Key Expiry

The idempotency key is stored in Redis with a TTL (e.g., 24 hours). After expiry:
- The same key would be treated as a new request
- This is intentional: after 24 hours, any retry is clearly a new intended action, not a network retry

### Which Endpoints Need This?

Not all endpoints need idempotency keys. Apply selectively:

```
YES — apply idempotency:
  POST /api/v1/orders          ← creates order, charges payment
  POST /api/v1/payments        ← financial transaction
  POST /api/v1/subscriptions   ← activates a plan
  POST /api/v1/invoices        ← creates billing record

NO — skip idempotency:
  GET  /api/v1/users           ← read-only, safe to repeat
  POST /api/v1/auth/login      ← login is naturally idempotent
  PATCH /api/v1/users/:id      ← depends on the operation (can be idempotent by nature)
```

### What Needs to Be Implemented

**New file: `src/common/middleware/idempotency.middleware.ts`**

Logic:
1. Read `Idempotency-Key` header from incoming request
2. If header missing → pass through (idempotency is opt-in per client)
3. Check Redis for key `idempotency:{key}`
4. If found → return stored response with status code, skip controller
5. If not found → let request proceed → intercept response → store in Redis with 24h TTL

**Redis key format:**
```
idempotency:f47ac10b-58cc-4372-a567-0e02b2c3d479
Value: { statusCode: 201, body: { success: true, data: { orderId: "..." } } }
TTL: 86400 seconds (24 hours)
```

**Apply middleware selectively in `AppModule`:**
```typescript
consumer
  .apply(IdempotencyMiddleware)
  .forRoutes(
    { path: 'orders', method: RequestMethod.POST },
    { path: 'payments', method: RequestMethod.POST },
    { path: 'subscriptions', method: RequestMethod.POST },
  );
```

---

## Implementation Priority

| # | Pattern | Risk Without It | Effort | Priority |
|---|---------|----------------|--------|----------|
| 1 | **Kafka DLQ** | Silent data loss on every consumer error | Low | **High** |
| 2 | **Circuit Breaker** | Cascading failure when any external service goes down | Low | **High** |
| 3 | **Idempotency Key** | Duplicate orders/payments on client retry | Medium | **High** |
| 4 | **Outbox Pattern** | Events lost on deployment or crash | Medium | Medium |

### Suggested Implementation Order

1. **Circuit Breaker** — lowest effort, highest immediate protection
2. **Kafka DLQ** — protects against data loss in existing consumers
3. **Idempotency Key** — protects financial and critical write endpoints
4. **Outbox Pattern** — implement last as it requires the most structural change

---

## Quick Reference

```
Problem                              → Solution
─────────────────────────────────────────────────────────────────
Consumer fails → message lost        → DLQ: retry N times, then park in .dlq topic
External service down → you go down  → Circuit Breaker: fail fast, recover automatically
App crash between DB write + publish → Outbox: write event to DB first, publish async
Client retry → duplicate operation   → Idempotency: cache response by unique key
```
