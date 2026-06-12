import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common"
import { AuthenticatedRequest } from "../../common/authenticated-request"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "../users/user.entity"
import { PurchasesService } from "./purchases.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("purchases")
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.purchasesService.findAll(request.user)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Get(":id")
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest
  ) {
    return this.purchasesService.findOne(id, request.user)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Post()
  create(
    @Body() body: Parameters<PurchasesService["create"]>[0],
    @Req() request: AuthenticatedRequest
  ) {
    return this.purchasesService.create(body, request.user)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Parameters<PurchasesService["update"]>[1],
    @Req() request: AuthenticatedRequest
  ) {
    return this.purchasesService.update(id, body, request.user)
  }

  @Roles(UserRole.Admin)
  @Put(":id/approve")
  approve(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Parameters<PurchasesService["approve"]>[1],
    @Req() request: AuthenticatedRequest
  ) {
    return this.purchasesService.approve(id, body, request.user)
  }

  @Roles(UserRole.Admin)
  @Put(":id/order")
  order(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Parameters<PurchasesService["markOrdered"]>[1],
    @Req() request: AuthenticatedRequest
  ) {
    return this.purchasesService.markOrdered(id, body, request.user)
  }

  @Roles(UserRole.Admin)
  @Put(":id/in-transit")
  markInTransit(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Parameters<PurchasesService["markInTransit"]>[1],
    @Req() request: AuthenticatedRequest
  ) {
    return this.purchasesService.markInTransit(id, body, request.user)
  }

  @Roles(UserRole.Admin)
  @Put(":id/receive")
  receive(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Parameters<PurchasesService["receive"]>[1],
    @Req() request: AuthenticatedRequest
  ) {
    return this.purchasesService.receive(id, body, request.user)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id/cancel")
  cancel(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Parameters<PurchasesService["cancel"]>[1],
    @Req() request: AuthenticatedRequest
  ) {
    return this.purchasesService.cancel(id, body, request.user)
  }

  @Roles(UserRole.Admin)
  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest
  ) {
    return this.purchasesService.remove(id, request.user)
  }
}
