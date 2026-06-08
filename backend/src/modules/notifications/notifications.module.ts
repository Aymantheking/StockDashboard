import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { MissingItemRequest } from "../missing-item-requests/missing-item-request.entity"
import { Purchase } from "../purchases/purchase.entity"
import { PartRequest } from "../requests/part-request.entity"
import { User } from "../users/user.entity"
import { NotificationsController } from "./notifications.controller"
import { Notification } from "./notification.entity"
import { NotificationSeen } from "./notification-seen.entity"
import { NotificationsService } from "./notifications.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PartRequest,
      MissingItemRequest,
      Purchase,
      Collaborator,
      Notification,
      NotificationSeen,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
