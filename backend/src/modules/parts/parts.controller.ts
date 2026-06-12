import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common"
import { UseGuards } from "@nestjs/common"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "../users/user.entity"
import { Part } from "./part.entity"
import { PartsService } from "./parts.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("parts")
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Get()
  findAll() {
    return this.partsService.findAll()
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.partsService.findOne(id)
  }

  @Roles(UserRole.Admin)
  @Post()
  create(@Body() part: Omit<Part, "id">) {
    return this.partsService.create(part)
  }

  @Roles(UserRole.Admin)
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() part: Partial<Omit<Part, "id">>
  ) {
    return this.partsService.update(id, part)
  }

  @Roles(UserRole.Admin)
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.partsService.remove(id)
  }
}
