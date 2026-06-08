import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { NotificationsModule } from "../notifications/notifications.module"
import { MissingItemRequest } from "./missing-item-request.entity"
import { MissingItemRequestsController } from "./missing-item-requests.controller"
import { MissingItemRequestsService } from "./missing-item-requests.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([MissingItemRequest, Collaborator]),
    NotificationsModule,
  ],
  controllers: [MissingItemRequestsController],
  providers: [MissingItemRequestsService],
})
export class MissingItemRequestsModule {}
