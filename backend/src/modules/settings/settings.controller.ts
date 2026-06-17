import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "../users/user.entity"
import { SettingsService } from "./settings.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Roles(
    UserRole.Admin,
    UserRole.InventoryManager,
    UserRole.Collaborator,
    UserRole.Viewer
  )
  @Get()
  getSettings() {
    return this.settingsService.getSettings()
  }

  @Roles(UserRole.Admin)
  @Put("low-stock-threshold")
  updateLowStockThreshold(@Body() body: { lowStockThreshold: number }) {
    return this.settingsService.updateLowStockThreshold(
      Number(body.lowStockThreshold)
    )
  }

  @Roles(UserRole.Admin)
  @Put("rating-rules")
  updateRatingRules(
    @Body()
    body: {
      lateReturnPenaltyStars: number
      damagedItemPenaltyStars: number
    }
  ) {
    return this.settingsService.updateRatingRules({
      lateReturnPenaltyStars: Number(body.lateReturnPenaltyStars),
      damagedItemPenaltyStars: Number(body.damagedItemPenaltyStars),
    })
  }

  @Roles(UserRole.Admin)
  @Put("stock-locations")
  updateStockLocations(@Body() body: { stockLocations: string[] }) {
    return this.settingsService.updateStockLocations(body.stockLocations || [])
  }

  @Roles(UserRole.Admin)
  @Put("inventory-categories")
  updateInventoryCategories(@Body() body: { inventoryCategories: string[] }) {
    return this.settingsService.updateInventoryCategories(
      body.inventoryCategories || []
    )
  }
}
