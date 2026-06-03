import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { Part } from "../parts/part.entity"
import { Reservation } from "../reservations/reservation.entity"
import { AnalyticsController } from "./analytics.controller"
import { AnalyticsService } from "./analytics.service"

@Module({
  imports: [TypeOrmModule.forFeature([Part, Collaborator, Reservation])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
