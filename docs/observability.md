# Observability — Logger, Metrics & Alerting

> NestJS + MongoDB template · Port `5132`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Winston Logger](#winston-logger)
   - [How it works](#how-it-works)
   - [Components](#components)
   - [Log formats](#log-formats)
   - [Log levels](#log-levels)
   - [What gets logged and where](#what-gets-logged-and-where)
   - [Environment variables](#environment-variables)
   - [How to use in your services](#how-to-use-in-your-services)
3. [Prometheus Metrics](#prometheus-metrics)
   - [How it works](#how-it-works-1)
   - [Collected metrics](#collected-metrics)
   - [Adding custom metrics](#adding-custom-metrics)
4. [Alerting — Email Notifications](#alerting--email-notifications)
   - [How alerting works](#how-alerting-works)
   - [Prometheus rules file](#prometheus-rules-file)
   - [Alertmanager config with email](#alertmanager-config-with-email)
   - [Full docker-compose setup](#full-docker-compose-setup)
5. [Grafana Dashboards](#grafana-dashboards)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
HTTP Request
     │
     ▼
LoggingMiddleware          ← logs inbound: method + url + client IP
     │
     ▼
LoggingInterceptor         ← logs outbound: status + duration + controller + handler + userId
     │
     ▼
HttpExceptionFilter        ← logs exceptions: 4xx as warn, 5xx as error (with stack trace)
     │
     ▼
MetricsMiddleware          ← records http_requests_total + http_request_duration_ms
     │
     ▼
Winston (nest-winston)     ← all log output goes through here
     │
     ├── development → colorized human-readable console
     └── production  → structured JSON (stdout → your log collector)

Prometheus scrapes /metrics every 15–30s
     │
     └── Alertmanager evaluates rules → sends email on alert
```

---

## Winston Logger

### How it works

Winston is integrated at two levels:

**1. NestJS framework logger** (`main.ts`)
```typescript
NestFactory.create(AppModule, {
  logger: WinstonModule.createLogger(createWinstonConfig()),
})
```
This replaces NestJS's built-in logger so framework messages (route mapping, module init, startup) also go through Winston.

**2. DI-injectable logger** (`LoggerModule`)
```typescript
WinstonModule.forRootAsync({ useFactory: createWinstonConfig })
```
Registers `WINSTON_MODULE_PROVIDER` in the DI container. Any class can inject it via `@Inject(WINSTON_MODULE_PROVIDER)`.

`createWinstonConfig()` is a **factory function** (not a constant) so it reads `process.env` at call-time, after `ConfigModule` has loaded `.env`.

---

### Components

#### `src/common/logger/winston.config.ts`
Single source of truth for Winston configuration. Returns `WinstonModuleOptions`. Selects format based on `NODE_ENV`.

#### `src/common/logger/logger.module.ts`
`@Global()` module — imported once in `AppModule`, available everywhere. Exports `WinstonModule` so any module can inject the logger without re-importing.

#### `src/common/middleware/logging.middleware.ts`
**Runs at Express middleware layer** — before NestJS interceptors. Logs the inbound request with real client IP (handles Cloudflare `cf-connecting-ip`, Akamai `true-client-ip`, `x-forwarded-for`, `x-real-ip`).

```
→ GET /api/v1/users from 92.168.1.1
```

Reason it runs here and not in the interceptor: interceptors cannot reliably read the client IP when behind a proxy.

#### `src/common/interceptors/logging.interceptor.ts`
**Runs inside NestJS DI** — has access to controller and handler names. Logs the outbound response after the handler finishes.

```
GET /api/v1/users [UserController.findAll] user:abc123 → 200 45ms ⚡
```

Duration indicators:
| Symbol | Meaning |
|--------|---------|
| ⚡ | < 100ms — fast |
| ✓ | 100–499ms — normal |
| ⚠ | 500–999ms — slow |
| 🐌 | ≥ 1000ms — critical |

Also catches errors and logs them before re-throwing so the exception filter can handle the response.

#### `src/common/filters/http-exception.filter.ts`
Global exception filter. Catches **all** unhandled exceptions. Logs:
- **4xx** (client errors) → `logger.warn('Client exception', ...)`
- **5xx** (server errors) → `logger.error('Server exception', ...)`

Log payload includes `statusCode`, `message`, `stack`, `path`, `method`, `userId`.

Response body:
```json
{ "success": false, "message": "User not found" }
```
With optional `error` field (debug context, only when exception provides it):
```json
{ "success": false, "message": "User not found", "error": "UserService.findById: MongoError..." }
```

---

### Log formats

#### Development (`NODE_ENV=development`)
Colorized, human-readable:
```
10:34:21 info [HTTP] → GET /api/v1/users from 127.0.0.1
10:34:21 info [HTTP] GET /api/v1/users [UserController.findAll] user:- → 200 12ms ⚡
10:34:22 warn [HTTP] Client exception
{
  "statusCode": 404,
  "message": "User not found",
  "path": "/api/v1/users/999",
  "method": "GET",
  "userId": null
}
```

#### Production (`NODE_ENV=production`)
Structured JSON — one object per line, suitable for Loki, Datadog, CloudWatch, etc.:
```json
{"level":"info","message":"→ GET /api/v1/users from 92.168.1.1","context":"HTTP","service":"my-service","environment":"production","timestamp":"2026-03-26T10:34:21.000Z"}
{"level":"info","message":"GET /api/v1/users [UserController.findAll] user:abc123 → 200 12ms ⚡","context":"HTTP","service":"my-service","environment":"production","timestamp":"2026-03-26T10:34:21.012Z"}
{"level":"error","message":"Server exception","statusCode":500,"stack":"Error: ...","path":"/api/v1/users","method":"POST","userId":"abc123","service":"my-service","environment":"production","timestamp":"2026-03-26T10:34:22.000Z"}
```

Every log entry automatically includes:
| Field | Source |
|-------|--------|
| `service` | `SERVICE_NAME` env var |
| `environment` | `NODE_ENV` env var |
| `timestamp` | Winston |
| `context` | Logger context string |

---

### Log levels

| Level | When used |
|-------|-----------|
| `error` | 5xx exceptions, bootstrap failures |
| `warn` | 4xx exceptions (client errors) |
| `info` | Inbound requests, outbound responses, startup messages |
| `debug` | Not used by default — add manually in services |

---

### What gets logged and where

| Event | Component | Level |
|-------|-----------|-------|
| App startup | `main.ts` Bootstrap | info |
| Module initialization | NestJS framework logger | info |
| Route mapping | NestJS framework logger | info |
| Inbound HTTP request + IP | `LoggingMiddleware` | info |
| Outbound HTTP response + duration | `LoggingInterceptor` | info / error |
| 4xx exception | `HttpExceptionFilter` | warn |
| 5xx exception + stack trace | `HttpExceptionFilter` | error |
| Your service code | `@Inject(WINSTON_MODULE_PROVIDER)` | any |

---

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Controls log format: `development` = colorized, `production` = JSON |
| `SERVICE_NAME` | `my-service` | Appears as `service` field in every log entry |

---

### How to use in your services

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class UserService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async findById(id: string) {
    this.logger.info('Finding user', { userId: id, context: 'UserService' });

    // ...

    this.logger.warn('User not found', { userId: id, context: 'UserService' });

    this.logger.error('Database error', {
      context: 'UserService',
      message: error.message,
      stack:   error.stack,
    });
  }
}
```

---

## Prometheus Metrics

### How it works

```
HTTP Request
     │
     ▼
MetricsMiddleware          ← starts timer on request
     │
     ▼  (response finishes)
res.on('finish')           ← records duration and increments counter
     │
     ▼
MetricsService.record()    ← calls prom-client Counter.inc() and Histogram.observe()
     │
     ▼
/metrics endpoint          ← Prometheus scrapes this every 15–30s
```

**Key design decision:** `req.route?.path` is used instead of `req.url`. This gives `/users/:id` instead of `/users/abc123`, preventing high-cardinality label explosion that would fill memory.

---

### Collected metrics

#### Default Node.js metrics (auto-collected every 10s)

| Metric | Type | Description |
|--------|------|-------------|
| `process_cpu_seconds_total` | Counter | CPU time consumed |
| `process_resident_memory_bytes` | Gauge | Physical memory used |
| `nodejs_heap_size_used_bytes` | Gauge | V8 heap used |
| `nodejs_heap_size_total_bytes` | Gauge | V8 heap total |
| `nodejs_external_memory_bytes` | Gauge | Memory used by C++ objects |
| `nodejs_eventloop_lag_seconds` | Gauge | Event loop delay (detects blocking) |
| `nodejs_gc_duration_seconds` | Histogram | GC pause durations |
| `nodejs_active_handles_total` | Gauge | Open connections, timers |
| `nodejs_active_requests_total` | Gauge | In-flight async requests |
| `process_open_fds` | Gauge | Open file descriptors |
| `process_start_time_seconds` | Gauge | Process start time (uptime) |
| `nodejs_version_info` | Gauge | Node.js version label |

#### Custom HTTP metrics

**`http_requests_total`** (Counter)
- Labels: `method`, `route`, `status_code`
- Incremented on every request completion
- Example: `http_requests_total{method="GET",route="/api/v1/users",status_code="200"} 1547`

**`http_request_duration_ms`** (Histogram)
- Labels: `method`, `route`, `status_code`
- Buckets: `50, 100, 200, 300, 500, 1000, 2000, 5000` ms
- Example queries:
  ```promql
  # 95th percentile latency per route
  histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

  # Request rate per second
  rate(http_requests_total[1m])

  # Error rate (5xx)
  rate(http_requests_total{status_code=~"5.."}[5m])
  ```

#### Metrics endpoint

```
GET http://localhost:5132/metrics
Content-Type: text/plain; version=0.0.4; charset=utf-8
```

This endpoint is excluded from the global `api/v1` prefix and from the `ResponseInterceptor` (which would otherwise wrap it in JSON and break Prometheus).

---

### Adding custom metrics

Add a new provider in `src/infrastructure/metrics/metrics.module.ts`:

```typescript
makeCounterProvider({
  name:       'user_registrations_total',
  help:       'Total user registrations',
  labelNames: ['plan'],
}),
```

Inject and use in your service:

```typescript
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

constructor(
  @InjectMetric('user_registrations_total')
  private readonly registrationsTotal: Counter<string>,
) {}

register(plan: string) {
  this.registrationsTotal.inc({ plan });
}
```

---

## Alerting — Email Notifications

Alerting requires three components running alongside your app:
1. **Prometheus** — scrapes `/metrics`, evaluates alert rules
2. **Alertmanager** — receives fired alerts, sends notifications (email, Slack, etc.)
3. **Your app** — exposes `/metrics`

### How alerting works

```
App /metrics
     │  (scraped every 15s)
     ▼
Prometheus
     │  (evaluates rules every 1m)
     ▼
Alert fires (e.g. error rate > 5%)
     │
     ▼
Alertmanager
     │  (groups, deduplicates, routes)
     ▼
Email notification → your@email.com
```

---

### Prometheus rules file

Create `/etc/prometheus/rules/app.rules.yml` on your VPS:

```yaml
groups:
  - name: app_alerts
    interval: 1m
    rules:

      # ── Availability ──────────────────────────────────────────────────────
      - alert: AppDown
        expr: up{job="nest-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "App is down"
          description: "{{ $labels.instance }} has been unreachable for > 1 minute."

      # ── Error Rate ────────────────────────────────────────────────────────
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status_code=~"5.."}[5m])
          /
          rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes."

      # ── Latency ───────────────────────────────────────────────────────────
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_ms_bucket[5m])
          ) > 2000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p95 latency above 2s"
          description: "95th percentile response time is {{ $value }}ms."

      # ── Memory ────────────────────────────────────────────────────────────
      - alert: HighMemoryUsage
        expr: nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Node.js heap > 90%"
          description: "Heap usage is at {{ $value | humanizePercentage }}."

      # ── Event Loop Lag ────────────────────────────────────────────────────
      - alert: EventLoopLag
        expr: nodejs_eventloop_lag_seconds > 0.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Event loop lag > 500ms"
          description: "Event loop is blocked or overloaded. Lag: {{ $value }}s."
```

---

### Alertmanager config with email

Create `/etc/alertmanager/alertmanager.yml`:

```yaml
global:
  # SMTP settings — update with your mail provider
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourdomain.com'
  smtp_auth_username: 'alerts@yourdomain.com'
  smtp_auth_password: 'your-app-password'   # Gmail: use App Password, not account password
  smtp_require_tls: true

route:
  receiver: 'email-alerts'
  group_by: ['alertname', 'severity']
  group_wait: 30s        # wait 30s to batch alerts before sending
  group_interval: 5m     # wait 5m before re-sending same group
  repeat_interval: 4h    # re-alert every 4h if still firing

  # Route critical alerts separately (faster repeat)
  routes:
    - matchers:
        - severity = critical
      receiver: 'email-critical'
      repeat_interval: 1h

receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'your@email.com'
        send_resolved: true    # also email when alert resolves
        html: |
          <h3>{{ .Status | toUpper }} — {{ .GroupLabels.alertname }}</h3>
          {{ range .Alerts }}
          <p><b>Summary:</b> {{ .Annotations.summary }}<br>
          <b>Description:</b> {{ .Annotations.description }}<br>
          <b>Severity:</b> {{ .Labels.severity }}<br>
          <b>Started:</b> {{ .StartsAt }}</p>
          {{ end }}

  - name: 'email-critical'
    email_configs:
      - to: 'oncall@yourdomain.com'
        send_resolved: true

inhibit_rules:
  # Suppress warning alerts when critical is already firing for same app
  - source_matchers:
      - severity = critical
    target_matchers:
      - severity = warning
    equal: ['job', 'instance']
```

**Gmail App Password setup:**
1. Go to Google Account → Security → 2-Step Verification → App passwords
2. Create password for "Mail"
3. Use that 16-character password in `smtp_auth_password`

---

### Full docker-compose setup

Create `docker-compose.monitoring.yml` in the project root:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/rules:/etc/prometheus/rules
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:
```

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 1m

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  - job_name: 'nest-app'
    static_configs:
      - targets: ['host.docker.internal:5132']   # your app's host:port
    metrics_path: /metrics
```

> On Linux VPS, replace `host.docker.internal` with the server's private IP or use `network_mode: host`.

Start monitoring stack:
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

Verify:
- Prometheus UI: `http://your-vps:9090`
- Alertmanager UI: `http://your-vps:9093`
- Grafana: `http://your-vps:3000` (admin / admin)

---

## Grafana Dashboards

After adding Prometheus as a data source in Grafana (`http://prometheus:9090`), useful panels:

**Request rate:**
```promql
rate(http_requests_total[1m])
```

**Error rate %:**
```promql
100 * rate(http_requests_total{status_code=~"5.."}[5m])
  / rate(http_requests_total[5m])
```

**p50 / p95 / p99 latency:**
```promql
histogram_quantile(0.50, rate(http_request_duration_ms_bucket[5m]))
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))
histogram_quantile(0.99, rate(http_request_duration_ms_bucket[5m]))
```

**Heap usage %:**
```promql
100 * nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes
```

**Event loop lag:**
```promql
nodejs_eventloop_lag_seconds * 1000
```

Import community dashboard ID **11159** (Node.js Application Dashboard) in Grafana for a ready-made layout.

---

## Troubleshooting

**Logs show `service: "my-service"` instead of your value**
→ `SERVICE_NAME` env var not set. Check `.env` file and confirm `NODE_ENV` is also set so the factory function picks up the right values.

**`/metrics` returns JSON `{"success":true,"data":"..."}`**
→ `ResponseInterceptor` is wrapping the response. Confirm `response.interceptor.ts` has the `/metrics` bypass:
```typescript
if (req.url?.startsWith('/metrics')) return next.handle();
```

**Prometheus shows `UP=0` for your app**
→ Firewall blocking port 5132. Run: `sudo ufw allow 5132`

**Email alerts not arriving**
→ Check Alertmanager logs: `docker logs alertmanager`
→ Verify SMTP credentials and that TLS port 587 is open outbound on your VPS.

**High cardinality warning in Prometheus**
→ If you see thousands of unique label combinations, `req.route?.path` may be returning raw URLs. Check that routes are registered in NestJS (a 404 has no `req.route` and falls back to `req.path` which includes the raw URL).
