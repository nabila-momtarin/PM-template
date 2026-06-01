import { Module } from "@nestjs/common";
import { TokenService } from "./services/token.service";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { CacheModule } from "@nestjs/cache-manager";
import { Role, RoleSchema } from "src/modules/role/entities/role.schema";
import { MongooseModule } from "@nestjs/mongoose";
// import { RbacGuard } from "./guards/rbac.guard";


@Module({
    imports: [
        JwtModule,
        CacheModule.register({
      ttl: 300,   // 5 minutes in seconds
      max: 500,   // max entries in the in-memory store
    }),
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
    ]),
    ],
    controllers: [],
    providers: [TokenService, JwtStrategy, /* RbacGuard */],
    exports: [TokenService, /* RbacGuard */],
})

export class AuthInfrastructureModule {}