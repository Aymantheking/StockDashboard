import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "../users/user.entity"
import { SuppliersService } from "./suppliers.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Get()
  findAll() {
    return this.suppliersService.findAll()
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.suppliersService.findOne(id)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Post()
  create(@Body() body: Parameters<SuppliersService["create"]>[0]) {
    return this.suppliersService.create(body)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: Parameters<SuppliersService["update"]>[1]
  ) {
    return this.suppliersService.update(id, body)
  }

  @Roles(UserRole.Admin)
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.suppliersService.remove(id)
  }
}
