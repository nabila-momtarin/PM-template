export default () => ({
  // PORT: process.env.PORT ?? 3000,
  port: parseInt(process.env.SERVER_PORT!, 10),

  dbUrl: process.env.DATABASE_URL,

  // corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  // jwt: {
  //   secret: process.env.JWT_SECRET,
  //   expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  // },

});
