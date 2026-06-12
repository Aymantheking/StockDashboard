import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { Part } from "../parts/part.entity"
import { Purchase } from "../purchases/purchase.entity"
import { PartRequest } from "../requests/part-request.entity"
import { SettingsModule } from "../settings/settings.module"
import { AnalyticsController } from "./analytics.controller"
import { AnalyticsService } from "./analytics.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([Part, Collaborator, PartRequest, Purchase]),
    SettingsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
