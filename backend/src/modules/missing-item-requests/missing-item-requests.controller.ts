import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from "@nestjs/common"
import { AuthenticatedRequest } from "../../common/authenticated-request"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "../users/user.entity"
import { MissingItemRequestsService } from "./missing-item-requests.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("missing-item-requests")
export class MissingItemRequestsController {
  constructor(
    private readonly missingItemRequestsService: MissingItemRequestsService
  ) {}

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.missingItemRequestsService.findAll(request.user)
  }

  @Roles(UserRole.Collaborator, UserRole.Admin, UserRole.InventoryManager)
  @Get("my")
  findMyRequests(@Req() request: AuthenticatedRequest) {
    return this.missingItemRequestsService.findMyRequests(request.user)
  }

  @Roles(UserRole.Collaborator, UserRole.Admin, UserRole.InventoryManager)
  @Post()
  create(
    @Body() body: Parameters<MissingItemRequestsService["create"]>[0],
    @Req() request: AuthenticatedRequest
  ) {
    return this.missingItemRequestsService.create(body, request.user)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id/approve")
  approve(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { managerComment?: string },
    @Req() request: AuthenticatedRequest
  ) {
    return this.missingItemRequestsService.approve(
      id,
      body.managerComment || "",
      request.user
    )
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id/reject")
  reject(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { managerComment?: string },
    @Req() request: AuthenticatedRequest
  ) {
    return this.missingItemRequestsService.reject(
      id,
      body.managerComment || "",
      request.user
    )
  }
}
