import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from "@nestjs/common"
import { AuthenticatedRequest } from "../../common/authenticated-request"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "../users/user.entity"
import { RequestsService } from "./requests.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("requests")
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.requestsService.findAll(request.user)
  }

  @Roles(UserRole.Collaborator, UserRole.Admin, UserRole.InventoryManager)
  @Get("my")
  findMyRequests(@Req() request: AuthenticatedRequest) {
    return this.requestsService.findMyRequests(request.user)
  }

  @Roles(UserRole.Collaborator, UserRole.Admin, UserRole.InventoryManager)
  @Post()
  create(@Body() body: Parameters<RequestsService["create"]>[0], @Req() request: AuthenticatedRequest) {
    return this.requestsService.create(body, request.user)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id/approve")
  approve(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { managerComment?: string },
    @Req() request: AuthenticatedRequest
  ) {
    return this.requestsService.approve(id, body.managerComment || "", request.user)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id/reject")
  reject(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { managerComment?: string },
    @Req() request: AuthenticatedRequest
  ) {
    return this.requestsService.reject(id, body.managerComment || "", request.user)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id/return")
  returnRequest(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { managerComment?: string },
    @Req() request: AuthenticatedRequest
  ) {
    return this.requestsService.returnRequest(
      id,
      body.managerComment || "",
      request.user
    )
  }
}
