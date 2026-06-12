import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Part } from "../parts/part.entity"
import { NotificationsModule } from "../notifications/notifications.module"
import { User } from "../users/user.entity"
import { Purchase } from "./purchase.entity"
import { PurchasesController } from "./purchases.controller"
import { PurchasesService } from "./purchases.service"

@Module({
  imports: [TypeOrmModule.forFeature([Purchase, Part, User]), NotificationsModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
