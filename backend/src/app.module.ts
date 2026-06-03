import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { AnalyticsModule } from "./modules/analytics/analytics.module"
import { AuthModule } from "./modules/auth/auth.module"
import { Collaborator } from "./modules/collaborators/collaborator.entity"
import { CollaboratorsModule } from "./modules/collaborators/collaborators.module"
import { MissingItemRequest } from "./modules/missing-item-requests/missing-item-request.entity"
import { MissingItemRequestsModule } from "./modules/missing-item-requests/missing-item-requests.module"
import { Part } from "./modules/parts/part.entity"
import { PartsModule } from "./modules/parts/parts.module"
import { PartRequest } from "./modules/requests/part-request.entity"
import { RequestsModule } from "./modules/requests/requests.module"
import { Reservation } from "./modules/reservations/reservation.entity"
import { ReservationsModule } from "./modules/reservations/reservations.module"
import { User } from "./modules/users/user.entity"
import { UsersModule } from "./modules/users/users.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DB_HOST", "localhost"),
        port: Number(configService.get<string>("DB_PORT", "5432")),
        username: configService.get<string>("DB_USERNAME", "postgres"),
        password: configService.get<string>("DB_PASSWORD", "postgres"),
        database: configService.get<string>("DB_DATABASE", "stock_dashboard"),
        entities: [
          Part,
          Collaborator,
          Reservation,
          User,
          PartRequest,
          MissingItemRequest,
        ],
        synchronize: process.env.NODE_ENV !== "production",
      }),
    }),
    UsersModule,
    AuthModule,
    PartsModule,
    CollaboratorsModule,
    ReservationsModule,
    AnalyticsModule,
    RequestsModule,
    MissingItemRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
