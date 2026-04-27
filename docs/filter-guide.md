# Filter, Sort & Pagination Guide

This guide explains how clients send filter, sort, and pagination parameters to the API.

All list endpoints accept these query parameters:

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| `filter`  | string | JSON filter object             |
| `sort`    | string | Sort field(s) with direction   |
| `page`    | number | Page number (default: 1)       |
| `length`  | number | Items per page (default: 10)   |

---

## Pagination

```
GET /api/v1/users?page=2&length=20
```

Response includes a `pagination` object:
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "totalItems": 95,
    "totalPages": 5,
    "currentPage": 2,
    "pageSize": 20
  }
}
```

---

## Sort

Pass `sort` as a comma-separated string.

### Formats

| Format           | Meaning               | Example                          |
|------------------|-----------------------|----------------------------------|
| `field:asc`      | Ascending             | `sort=name:asc`                  |
| `field:desc`     | Descending            | `sort=createdAt:desc`            |
| `+field`         | Ascending             | `sort=+name`                     |
| `-field`         | Descending            | `sort=-createdAt`                |
| `field`          | Ascending (default)   | `sort=name`                      |
| Multiple fields  | Comma-separated       | `sort=createdAt:desc,name:asc`   |
| JSON array       | Array of strings      | `sort=["-createdAt","+name"]`    |

### Examples

```
GET /api/v1/users?sort=createdAt:desc
GET /api/v1/users?sort=name:asc,createdAt:desc
GET /api/v1/users?sort=-createdAt,+name
```

---

## Filter

The `filter` parameter accepts a **JSON string** with logical groups: `and`, `or`, `not`.

### Structure

```
filter={"and": { ... }, "or": [ ... ], "not": { ... }}
```

- `and` → all conditions must match (`$and`)
- `or`  → any condition must match (`$or`) — accepts array or object
- `not` → none of the conditions match (`$nor`)

Fields use the format: `fieldName__operator`

---

## Operators

### Basic

| Operator | Description       | Example                              |
|----------|-------------------|--------------------------------------|
| `eq`     | Equal (default)   | `"status__eq": "active"`             |
| `ne`     | Not equal         | `"status__ne": "deleted"`            |
| `in`     | In list           | `"role__in": ["admin", "editor"]`    |
| `nin`    | Not in list       | `"role__nin": ["guest"]`             |

> `eq` is the default — `"status": "active"` and `"status__eq": "active"` are identical.

### Comparison

| Operator  | Description              | Example                       |
|-----------|--------------------------|-------------------------------|
| `gt`      | Greater than             | `"age__gt": 18`               |
| `lt`      | Less than                | `"age__lt": 65`               |
| `gte`     | Greater than or equal    | `"age__gte": 18`              |
| `lte`     | Less than or equal       | `"age__lte": 65`              |
| `between` | Between two values       | `"age__between": [18, 65]`    |

### String

| Operator          | Description                   | Case     | Example                                    |
|-------------------|-------------------------------|----------|--------------------------------------------|
| `like`            | Contains substring            | insensitive | `"name__like": "john"`               |
| `contains`        | Alias for `like`              | insensitive | `"name__contains": "john"`           |
| `ilike`           | Alias for `like`              | insensitive | `"name__ilike": "john"`              |
| `exactContains`   | Contains substring            | sensitive   | `"code__exactContains": "ABC"`       |
| `startsWith`      | Starts with                   | insensitive | `"name__startsWith": "Jo"`           |
| `exactStartsWith` | Starts with                   | sensitive   | `"code__exactStartsWith": "TX"`      |
| `endsWith`        | Ends with                     | insensitive | `"email__endsWith": ".com"`          |
| `exactEndsWith`   | Ends with                     | sensitive   | `"code__exactEndsWith": "XYZ"`       |
| `notContains`     | Does not contain              | insensitive | `"name__notContains": "test"`        |
| `regex`           | Raw regex pattern             | sensitive   | `"code__regex": "^[A-Z]{3}"`         |
| `search`          | General search (regex)        | insensitive | `"name__search": "john"`             |

### Date

| Operator    | Description                       | Value format              | Example                                                |
|-------------|-----------------------------------|---------------------------|--------------------------------------------------------|
| `day`       | Exact day                         | ISO date string           | `"createdAt__day": "2025-03-15"`                       |
| `month`     | Entire month                      | ISO date string           | `"createdAt__month": "2025-03-01"`                     |
| `year`      | Entire year                       | ISO date string           | `"createdAt__year": "2025-01-01"`                      |
| `before`    | Before a date                     | ISO date string           | `"createdAt__before": "2025-01-01"`                    |
| `after`     | After a date                      | ISO date string           | `"createdAt__after": "2025-01-01"`                     |
| `dateRange` | Between two dates (inclusive)     | `[startDate, endDate]`    | `"createdAt__dateRange": ["2025-01-01","2025-12-31"]`  |

### Null / Boolean

| Operator     | Description        | Example                        |
|--------------|--------------------|--------------------------------|
| `isNull`     | Field is null      | `"deletedAt__isNull": true`    |
| `isNotNull`  | Field is not null  | `"deletedAt__isNotNull": true` |
| `isTrue`     | Field is true      | `"isActive__isTrue": true`     |
| `isFalse`    | Field is false     | `"isActive__isFalse": true`    |

### Array Fields

| Operator    | Description                              | Example                                         |
|-------------|------------------------------------------|-------------------------------------------------|
| `has`       | Array contains a value                   | `"tags__has": "featured"`                       |
| `hasSome`   | Array contains at least one value        | `"tags__hasSome": ["featured", "new"]`          |
| `hasEvery`  | Array contains all values                | `"tags__hasEvery": ["featured", "new"]`         |
| `isEmpty`   | Array is empty                           | `"tags__isEmpty": true`                         |

### Embedded Documents

| Operator       | Description                          | Example                                           |
|----------------|--------------------------------------|---------------------------------------------------|
| `jsonContains` | Array element matches partial object | `"addresses__jsonContains": {"city": "Dubai"}`    |
| `jsonHas`      | Nested key exists                    | `"profile__jsonHas": "avatar"`                    |

---

## Logical Groups

### AND — all conditions must match

```
GET /api/v1/users?filter={"and":{"isActive__isTrue":true,"age__gte":18}}
```

### OR — any condition must match

Object form (different fields):
```
GET /api/v1/users?filter={"or":{"role__eq":"admin","isVerified__isTrue":true}}
```

Array form (same or different fields):
```
GET /api/v1/users?filter={"or":[{"role__eq":"admin"},{"role__eq":"editor"}]}
```

### NOT — none of the conditions match

```
GET /api/v1/users?filter={"not":{"status__eq":"deleted"}}
```

### Combined AND + OR + NOT

```
GET /api/v1/users?filter={"and":{"isActive__isTrue":true},"not":{"role__eq":"guest"}}
```

---

## Complete Examples

### 1. Active users aged 18–40, sorted by name
```
GET /api/v1/users
  ?filter={"and":{"isActive__isTrue":true,"age__between":[18,40]}}
  &sort=name:asc
  &page=1
  &length=20
```

### 2. Users created this month
```
GET /api/v1/users
  ?filter={"and":{"createdAt__month":"2025-03-01"}}
  &sort=createdAt:desc
```

### 3. Search by name or email
```
GET /api/v1/users
  ?filter={"or":[{"name__like":"john"},{"email__like":"john"}]}
```

### 4. Users with role admin or editor, excluding deleted
```
GET /api/v1/users
  ?filter={"or":[{"role__eq":"admin"},{"role__eq":"editor"}],"not":{"deletedAt__isNotNull":true}}
```

### 5. Orders in a date range with amount > 100
```
GET /api/v1/orders
  ?filter={"and":{"createdAt__dateRange":["2025-01-01","2025-03-31"],"amount__gt":100}}
  &sort=amount:desc
  &page=1
  &length=50
```

### 6. Products tagged "featured" and not out of stock
```
GET /api/v1/products
  ?filter={"and":{"tags__has":"featured"},"not":{"stock__eq":0}}
```

---

## How to Use in a Controller (Server Side)

Use `getAllData()` from `BaseRepository` — it handles filter decoding, sort parsing, and pagination internally:

```typescript
@Get()
async findAll(@Query() query: UserQueryDto) {
  const result = await this.userRepository.getAllData({
    filter: query.filter ?? '{}',
    sortStr: query.sort ?? '-createdAt',
    page: query.page ?? '1',
    length: query.length ?? '10',
    filterableFields: ['name', 'email', 'isActive', 'createdAt', 'role'],
  });

  return {
    success:    true,
    message:    'Users retrieved',
    data:       result.data,
    pagination: result.pagination,
  };
}
```

The `filterableFields` option restricts which fields clients are allowed to filter on. Any field not in the list throws a `400 Bad Request`, preventing filtering on sensitive or unindexed fields.

---

## JavaScript / Frontend Usage

```javascript
const filter = JSON.stringify({
  and: {
    isActive__isTrue: true,
    createdAt__dateRange: ['2025-01-01', '2025-12-31'],
  },
  not: {
    role__eq: 'guest',
  },
});

const params = new URLSearchParams({
  filter,
  sort:   'createdAt:desc',
  page:   '1',
  length: '20',
});

const response = await fetch(`/api/v1/users?${params}`);
```
