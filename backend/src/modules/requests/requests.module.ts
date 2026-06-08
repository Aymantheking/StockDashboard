import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { RatingHistory } from "../collaborators/rating-history.entity"
import { Part } from "../parts/part.entity"
import { NotificationsModule } from "../notifications/notifications.module"
import { PartRequest } from "./part-request.entity"
import { RequestsController } from "./requests.controller"
import { RequestsService } from "./requests.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([PartRequest, Part, Collaborator, RatingHistory]),
    NotificationsModule,
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
