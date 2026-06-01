import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AnalyticsModule } from "./modules/analytics/analytics.module"
import { CollaboratorsModule } from "./modules/collaborators/collaborators.module"
import { PartsModule } from "./modules/parts/parts.module"
import { ReservationsModule } from "./modules/reservations/reservations.module"
import { databaseConfig } from "./config/database.config"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    PartsModule,
    CollaboratorsModule,
    ReservationsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
