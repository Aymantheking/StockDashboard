import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { CreateReservationDto } from "./dto/create-reservation.dto"
import { UpdateReservationDto } from "./dto/update-reservation.dto"
import { ReservationsService } from "./reservations.service"

@ApiTags("reservations")
@Controller("reservations")
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  findAll() {
    return this.reservationsService.findAll()
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.reservationsService.findOne(id)
  }

  @Post()
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto)
  }

  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto
  ) {
    return this.reservationsService.update(id, updateReservationDto)
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.reservationsService.remove(id)
  }
}
