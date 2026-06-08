import { Controller, Get, Post, Req, UseGuards } from "@nestjs/common"
import { AuthenticatedRequest } from "../../common/authenticated-request"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "../users/user.entity"
import { NotificationsService } from "./notifications.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles(
    UserRole.Admin,
    UserRole.InventoryManager,
    UserRole.Collaborator,
    UserRole.Viewer
  )
  @Get("summary")
  getSummary(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.getSummary(request.user)
  }

  @Roles(
    UserRole.Admin,
    UserRole.InventoryManager,
    UserRole.Collaborator,
    UserRole.Viewer
  )
  @Post("mark-all-seen")
  markAllSeen(@Req() request: AuthenticatedRequest) {
    return this.notificationsService.markAllSeen(request.user)
  }
}
