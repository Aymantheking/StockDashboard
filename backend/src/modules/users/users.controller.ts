import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from "@nestjs/common"
import { Roles } from "../../common/roles.decorator"
import { RolesGuard } from "../../common/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { EmailVerificationStatus, UserRole } from "./user.entity"
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

  @Put(":id/verify")
  async verifyUser(@Param("id", ParseIntPipe) id: number) {
    const user = await this.usersService.updateVerificationStatus(
      id,
      EmailVerificationStatus.Verified
    )
    return this.usersService.toPublicUser(user)
  }

  @Put(":id/reject")
  async rejectUser(@Param("id", ParseIntPipe) id: number) {
    const user = await this.usersService.updateVerificationStatus(
      id,
      EmailVerificationStatus.Rejected
    )
    return this.usersService.toPublicUser(user)
  }
}
