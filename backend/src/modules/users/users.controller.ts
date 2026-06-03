import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from "@nestjs/common"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { UserRole } from "./user.entity"
import { UsersService } from "./users.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll()
    return users.map((user) => this.usersService.toPublicUser(user))
  }

  @Put(":id/assignment")
  async updateAssignment(
    @Param("id", ParseIntPipe) id: number,
    @Body()
    body: {
      role: UserRole
      managedDivision?: Parameters<UsersService["updateAssignment"]>[1]["managedDivision"]
    }
  ) {
    const user = await this.usersService.updateAssignment(id, body)
    return this.usersService.toPublicUser(user)
  }
}
