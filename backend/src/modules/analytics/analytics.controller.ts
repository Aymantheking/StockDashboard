import { Controller, Get, UseGuards } from "@nestjs/common"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "../users/user.entity"
import { AnalyticsService } from "./analytics.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles(
    UserRole.Admin,
    UserRole.InventoryManager,
    UserRole.Viewer
  )
  @Get("summary")
  getSummary() {
    return this.analyticsService.getSummary()
  }
}
