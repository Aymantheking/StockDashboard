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
import { Reservation } from "./reservation.entity"
import { ReservationsService } from "./reservations.service"

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("reservations")
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Roles(UserRole.Admin, UserRole.InventoryManager, UserRole.Viewer)
  @Get()
  findAll() {
    return this.reservationsService.findAll()
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager, UserRole.Viewer)
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.reservationsService.findOne(id)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager, UserRole.Collaborator)
  @Post()
  create(@Body() reservation: Omit<Reservation, "id">) {
    return this.reservationsService.create(reservation)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() reservation: Partial<Omit<Reservation, "id">>
  ) {
    return this.reservationsService.update(id, reservation)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id/mark-borrowed")
  markBorrowed(@Param("id", ParseIntPipe) id: number) {
    return this.reservationsService.markBorrowed(id)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Put(":id/return")
  returnReservation(@Param("id", ParseIntPipe) id: number) {
    return this.reservationsService.returnReservation(id)
  }

  @Roles(UserRole.Admin, UserRole.InventoryManager)
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.reservationsService.remove(id)
  }
}
