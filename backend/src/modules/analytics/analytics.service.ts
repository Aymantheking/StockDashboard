import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Collaborator } from "../collaborators/entities/collaborator.entity"
import { Part } from "../parts/entities/part.entity"
import {
  Reservation,
  ReservationStatus,
} from "../reservations/entities/reservation.entity"

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>,
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>,
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>
  ) {}

  async getSummary() {
    const [parts, collaborators, reservations] = await Promise.all([
      this.partsRepository.find(),
      this.collaboratorsRepository.find(),
      this.reservationsRepository.find({ relations: { collaborator: true, part: true } }),
    ])

    return {
      totalParts: parts.length,
      availableParts: parts.filter((part) => part.status === "Available").length,
      borrowedParts: parts.filter((part) => part.status === "Borrowed").length,
      reservedReservations: reservations.filter(
        (reservation) => reservation.status === ReservationStatus.Reserved
      ).length,
      totalCollaborators: collaborators.length,
      activeBorrowers: new Set(
        reservations
          .filter((reservation) => reservation.status === ReservationStatus.Borrowed)
          .map((reservation) => reservation.collaboratorId)
      ).size,
      lowStockParts: parts.filter(
        (part) => part.status === "Low Stock" || part.quantity <= 5
      ).length,
    }
  }
}
