import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common"
import { AuthenticatedRequest } from "../../common/authenticated-request"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "../users/user.entity"
import { NotificationsService } from "./notifications.service"

const notificationRoles = [
  UserRole.Admin,
  UserRole.InventoryManager,
  UserRole.Collaborator,
  UserRole.Viewer,
]

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles(...notificationRoles)
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.findAll(request.user)
  }

  @Roles(...notificationRoles)
  @Get("summary")
  getSummary(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.getSummary(request.user)
  }

  @Roles(...notificationRoles)
  @Put("read-all")
  markAllRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(request.user)
  }

  @Roles(...notificationRoles)
  @Delete("clear-read")
  clearRead(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.clearRead(request.user)
  }

  @Roles(...notificationRoles)
  @Put(":id/read")
  markRead(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest
  ) {
    return this.notificationsService.markRead(id, request.user)
  }

  @Roles(...notificationRoles)
  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest
  ) {
    return this.notificationsService.remove(id, request.user)
  }
}
