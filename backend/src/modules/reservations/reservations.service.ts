import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { CreateReservationDto } from "./dto/create-reservation.dto"
import { UpdateReservationDto } from "./dto/update-reservation.dto"
import { Reservation } from "./entities/reservation.entity"

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>
  ) {}

  findAll() {
    return this.reservationsRepository.find({
      relations: { collaborator: true, part: true },
      order: { id: "ASC" },
    })
  }

  async findOne(id: number) {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
      relations: { collaborator: true, part: true },
    })

    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`)
    }

    return reservation
  }

  create(createReservationDto: CreateReservationDto) {
    const reservation = this.reservationsRepository.create(createReservationDto)
    return this.reservationsRepository.save(reservation)
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    const reservation = await this.findOne(id)
    Object.assign(reservation, updateReservationDto)
    return this.reservationsRepository.save(reservation)
  }

  async remove(id: number) {
    const reservation = await this.findOne(id)
    await this.reservationsRepository.remove(reservation)
    return { deleted: true }
  }
}
