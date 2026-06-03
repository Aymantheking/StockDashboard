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
import { Collaborator } from "./collaborator.entity"
import { CollaboratorsService } from "./collaborators.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("collaborators")
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Roles(UserRole.Admin, UserRole.InventoryManager, UserRole.Viewer)
  @Get()
  findAll() {
    return this.collaboratorsService.findAll()
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager, UserRole.Viewer)
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.collaboratorsService.findOne(id)
  }

  @Roles(UserRole.Admin)
  @Post()
  create(@Body() collaborator: Omit<Collaborator, "id">) {
    return this.collaboratorsService.create(collaborator)
  }

  @Roles(UserRole.Admin)
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() collaborator: Partial<Omit<Collaborator, "id">>
  ) {
    return this.collaboratorsService.update(id, collaborator)
  }

  @Roles(UserRole.Admin)
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.collaboratorsService.remove(id)
  }
}
