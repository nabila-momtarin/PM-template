export default () => ({
  port: parseInt(process.env.SERVER_PORT!, 10),

  dbUrl: process.env.DATABASE_URL,

  // serviceId: process.env.SERVICE_ID, 

  rbac: {
    enabled: process.env.RBAC_ENABLED === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },

  // redis: {
  //   host: process.env.REDIS_HOST ?? 'localhost',
  //   port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  //   logs: process.env.REDIS_LOGS === 'true',
  // },

  // kafka: {
  //   clientId: process.env.KAFKA_CLIENT_ID ?? 'nest-template-service',
  //   brokers: process.env.KAFKA_BROKERS?.split(',') ?? ['localhost:9092'],
  // },

  externalServices: {
    // billing: process.env.BILLING_SERVICE_URL,
    // business: process.env.BUSINESS_SERVICE_URL,
    notification: process.env.NOTIFICATION_SERVICE_URL,
    // subscription: process.env.SUBSCRIPTION_SERVICE_URL,
    // vbs: process.env.VBS_SERVICE_URL,
    // meta: process.env.META_SERVICE_URL,
    // rbac: process.env.RBAC_SERVICE_URL,
  },
});
