import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "../collaborators/entities/collaborator.entity"
import { Part } from "../parts/entities/part.entity"
import { Reservation } from "../reservations/entities/reservation.entity"
import { AnalyticsController } from "./analytics.controller"
import { AnalyticsService } from "./analytics.service"

@Module({
  imports: [TypeOrmModule.forFeature([Part, Collaborator, Reservation])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
