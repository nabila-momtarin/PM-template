import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ── Required ────────────────────────────────────────────────────────────
  SERVER_PORT:      Joi.number().required(),
  // SERVICE_NAME:     Joi.string().required(),    ?
  DATABASE_URL:     Joi.string().required(),
  JWT_SECRET:       Joi.string().required(),
  // SERVICE_ID:       Joi.string().required(),     ?
  // INTERNAL_API_KEY: Joi.string().required(),    ?

  // ── App ──────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // ── Feature Flags ────────────────────────────────────────────────────────
  RBAC_ENABLED:    Joi.string().valid('true', 'false').default('false'),
  // SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('false'),    ?

  // ── JWT ──────────────────────────────────────────────────────────────────
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // ── Redis ────────────────────────────────────────────────────────────────
  // REDIS_HOST: Joi.string().default('localhost'),
  // REDIS_PORT: Joi.number().default(6379),
  // REDIS_LOGS: Joi.string().valid('true', 'false').default('false'),

  // ── Kafka ────────────────────────────────────────────────────────────────
  // KAFKA_CLIENT_ID: Joi.string().default('nest-template-service'),
  // KAFKA_BROKERS:   Joi.string().default('localhost:9092'),
  // KAFKA_GROUP_ID:  Joi.string().optional(),

  // ── External Services (optional) ─────────────────────────────────────────
  // BILLING_SERVICE_URL:      Joi.string().uri().optional(),
  // BUSINESS_SERVICE_URL:     Joi.string().uri().optional(),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().optional(),
  // SUBSCRIPTION_SERVICE_URL: Joi.string().uri().optional(),
  // VBS_SERVICE_URL:          Joi.string().uri().optional(),
  // META_SERVICE_URL:         Joi.string().uri().optional(),
  // RBAC_SERVICE_URL:         Joi.string().uri().optional(),
}).unknown(true);  //schema-তে declare করা নাই এমন extra env থাকলেও allow করো
 