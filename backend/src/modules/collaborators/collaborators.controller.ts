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
import { Collaborator } from "./collaborator.entity"
import { CollaboratorsService } from "./collaborators.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("collaborators")
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Roles(UserRole.Admin, UserRole.InventoryManager, UserRole.Viewer)
  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.collaboratorsService.findAllForUser(request.user)
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
