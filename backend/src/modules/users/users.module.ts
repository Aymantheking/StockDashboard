import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { User } from "./user.entity"
import { NotificationsModule } from "../notifications/notifications.module"
import { UsersController } from "./users.controller"
import { UsersService } from "./users.service"

@Module({
  imports: [TypeOrmModule.forFeature([User]), NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
