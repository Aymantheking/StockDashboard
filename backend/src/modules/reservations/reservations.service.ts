import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { Part } from "../parts/part.entity"
import { Reservation, ReservationStatus } from "./reservation.entity"

type ReservationInput = Omit<
  Reservation,
  "id" | "createdAt" | "updatedAt" | "collaborator" | "part"
>

@Injectable()
export class ReservationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>,
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>
  ) {}

  async onModuleInit() {
    const count = await this.reservationsRepository.count()

    if (count > 0) {
      return
    }

    const raspberryPi = await this.partsRepository.findOne({
      where: { reference: "RPi-4B" },
    })
    const fallbackPart = await this.partsRepository.findOne({
      where: { reference: "NUCLEO-F446RE" },
    })
    const ahmed = await this.collaboratorsRepository.findOne({
      where: { email: "ahmed.b@bertrandt.com" },
    })
    const sara = await this.collaboratorsRepository.findOne({
      where: { email: "sara.m@bertrandt.com" },
    })

    if (raspberryPi && ahmed && raspberryPi.quantity >= 1) {
      await this.create({
        collaboratorId: ahmed.id,
        partId: raspberryPi.id,
        quantity: 1,
        expectedReturnDate: "2026-06-10",
        status: ReservationStatus.Borrowed,
      })
    }

    if (fallbackPart && sara && fallbackPart.quantity >= 1) {
      await this.create({
        collaboratorId: sara.id,
        partId: fallbackPart.id,
        quantity: 1,
        expectedReturnDate: "2026-06-07",
        status: ReservationStatus.Reserved,
      })
    }
  }

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
      throw new NotFoundException(`Reservation with id ${id} not found`)
    }

    return reservation
  }

  async create(input: ReservationInput) {
    this.validateReservationInput(input)

    const [part, collaborator] = await Promise.all([
      this.findPart(input.partId),
      this.findCollaborator(input.collaboratorId),
    ])

    if (this.shouldHoldQuantity(input.status)) {
      await this.reducePartQuantity(part, input.quantity)
    }

    const reservation = this.reservationsRepository.create({
      ...input,
      collaboratorId: collaborator.id,
      partId: part.id,
    })

    return this.reservationsRepository.save(reservation)
  }

  async update(id: number, input: Partial<ReservationInput>) {
    const reservation = await this.findOne(id)
    const previousHeldQuantity = this.shouldHoldQuantity(reservation.status)
      ? reservation.quantity
      : 0
    const updatedReservation = { ...reservation, ...input }

    this.validateReservationInput(updatedReservation)

    const [part, collaborator] = await Promise.all([
      this.findPart(updatedReservation.partId),
      this.findCollaborator(updatedReservation.collaboratorId),
    ])
    const nextHeldQuantity = this.shouldHoldQuantity(updatedReservation.status)
      ? updatedReservation.quantity
      : 0

    if (reservation.partId !== updatedReservation.partId) {
      if (previousHeldQuantity > 0) {
        const previousPart = await this.findPart(reservation.partId)
        previousPart.quantity += previousHeldQuantity
        await this.partsRepository.save(previousPart)
      }

      if (nextHeldQuantity > 0) {
        await this.reducePartQuantity(part, nextHeldQuantity)
      }
    } else {
      const quantityDelta = nextHeldQuantity - previousHeldQuantity

      if (quantityDelta > 0) {
        await this.reducePartQuantity(part, quantityDelta)
      }

      if (quantityDelta < 0) {
        part.quantity += Math.abs(quantityDelta)
        await this.partsRepository.save(part)
      }
    }

    Object.assign(reservation, {
      ...updatedReservation,
      collaboratorId: collaborator.id,
      partId: part.id,
    })

    return this.reservationsRepository.save(reservation)
  }

  async remove(id: number) {
    const reservation = await this.findOne(id)

    if (this.shouldHoldQuantity(reservation.status)) {
      const part = await this.findPart(reservation.partId)
      part.quantity += reservation.quantity
      await this.partsRepository.save(part)
    }

    await this.reservationsRepository.remove(reservation)
    return { deleted: true }
  }

  async markBorrowed(id: number) {
    const reservation = await this.findOne(id)

    if (reservation.status === ReservationStatus.Returned) {
      throw new BadRequestException("returned reservation cannot be borrowed")
    }

    if (reservation.status === ReservationStatus.Borrowed) {
      return reservation
    }

    reservation.status = ReservationStatus.Borrowed
    return this.reservationsRepository.save(reservation)
  }

  async returnReservation(id: number) {
    const reservation = await this.findOne(id)

    if (reservation.status === ReservationStatus.Returned) {
      throw new BadRequestException("returned reservation cannot be returned twice")
    }

    const part = await this.findPart(reservation.partId)
    part.quantity += reservation.quantity
    await this.partsRepository.save(part)

    reservation.status = ReservationStatus.Returned
    return this.reservationsRepository.save(reservation)
  }

  private validateReservationInput(input: Partial<ReservationInput>) {
    if (!Number.isInteger(input.collaboratorId)) {
      throw new BadRequestException("collaboratorId is required")
    }

    if (!Number.isInteger(input.partId)) {
      throw new BadRequestException("partId is required")
    }

    if (!Number.isInteger(input.quantity) || Number(input.quantity) <= 0) {
      throw new BadRequestException("quantity must be greater than 0")
    }

    if (!input.expectedReturnDate || typeof input.expectedReturnDate !== "string") {
      throw new BadRequestException("expectedReturnDate is required")
    }

    if (
      !Object.values(ReservationStatus).includes(input.status as ReservationStatus)
    ) {
      throw new BadRequestException("status is invalid")
    }
  }

  private shouldHoldQuantity(status: ReservationStatus) {
    return status === ReservationStatus.Reserved || status === ReservationStatus.Borrowed
  }

  private async findPart(id: number) {
    const part = await this.partsRepository.findOne({ where: { id } })

    if (!part) {
      throw new NotFoundException(`Part with id ${id} not found`)
    }

    return part
  }

  private async findCollaborator(id: number) {
    const collaborator = await this.collaboratorsRepository.findOne({
      where: { id },
    })

    if (!collaborator) {
      throw new NotFoundException(`Collaborator with id ${id} not found`)
    }

    return collaborator
  }

  private async reducePartQuantity(part: Part, quantity: number) {
    if (quantity > part.quantity) {
      throw new BadRequestException("cannot reserve more than available part quantity")
    }

    part.quantity -= quantity
    await this.partsRepository.save(part)
  }
}
