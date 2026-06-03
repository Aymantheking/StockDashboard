import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import {
  Collaborator,
  CollaboratorGroup,
  Division,
} from "../collaborators/collaborator.entity"
import { Part } from "../parts/part.entity"
import {
  Reservation,
  ReservationStatus,
} from "../reservations/reservation.entity"

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
      this.reservationsRepository.find({ relations: ["part", "collaborator"] }),
    ])

    const lowStockItems = parts.filter(
      (part) => part.status === "Low Stock" || part.quantity <= 5
    )
    const borrowedReservations = reservations.filter(
      (reservation) => reservation.status === ReservationStatus.Borrowed
    )
    const reservedReservations = reservations.filter(
      (reservation) => reservation.status === ReservationStatus.Reserved
    )
    const returnedReservations = reservations.filter(
      (reservation) => reservation.status === ReservationStatus.Returned
    )

    return {
      totalParts: parts.length,
      availableParts: parts.filter((part) => part.status === "Available").length,
      borrowedParts: borrowedReservations.reduce(
        (total, reservation) => total + reservation.quantity,
        0
      ),
      reservedParts: reservedReservations.reduce(
        (total, reservation) => total + reservation.quantity,
        0
      ),
      lowStockParts: lowStockItems.length,
      lowStockItems,
      totalCollaborators: collaborators.length,
      activeBorrowers: this.getActiveBorrowers(collaborators, reservations),
      totalReservations: reservations.length,
      reservedReservations: reservedReservations.length,
      borrowedReservations: borrowedReservations.length,
      returnedReservations: returnedReservations.length,
      mostBorrowedParts: this.getMostBorrowedParts(reservations),
      mostActiveCollaborators: this.getMostActiveCollaborators(
        collaborators,
        reservations
      ),
      inventoryByCategory: this.getInventoryByCategory(parts),
      reservationsByDivision: this.getReservationsByDivision(
        collaborators,
        reservations
      ),
      borrowedPartsByGroup: this.getBorrowedPartsByGroup(
        collaborators,
        reservations
      ),
    }
  }

  private getMostBorrowedParts(reservations: Reservation[]) {
    const counts = reservations.reduce<Record<string, number>>(
      (partCounts, reservation) => {
        const partName = reservation.part?.name || "Unknown part"
        partCounts[partName] = (partCounts[partName] || 0) + 1
        return partCounts
      },
      {}
    )

    return Object.entries(counts)
      .map(([partName, borrowCount]) => ({ partName, borrowCount }))
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .slice(0, 10)
  }

  private getMostActiveCollaborators(
    collaborators: Collaborator[],
    reservations: Reservation[]
  ) {
    return collaborators
      .map((collaborator) => {
        const collaboratorReservations = reservations.filter(
          (reservation) => reservation.collaboratorId === collaborator.id
        )

        return {
          collaboratorName: collaborator.name,
          reservationCount: collaboratorReservations.length,
          borrowedCount: collaboratorReservations.filter(
            (reservation) => reservation.status === ReservationStatus.Borrowed
          ).length,
        }
      })
      .sort((a, b) => b.reservationCount - a.reservationCount)
      .slice(0, 10)
  }

  private getInventoryByCategory(parts: Part[]) {
    const categories = parts.reduce<Record<string, number>>((counts, part) => {
      counts[part.category] = (counts[part.category] || 0) + 1
      return counts
    }, {})

    return Object.entries(categories).map(([category, count]) => ({
      category,
      count,
    }))
  }

  private getReservationsByDivision(
    collaborators: Collaborator[],
    reservations: Reservation[]
  ) {
    return Object.values(Division).map((division) => {
      const divisionCollaboratorIds = collaborators
        .filter((collaborator) => collaborator.division === division)
        .map((collaborator) => collaborator.id)
      const divisionReservations = reservations.filter((reservation) =>
        divisionCollaboratorIds.includes(reservation.collaboratorId)
      )

      return {
        division,
        collaborators: divisionCollaboratorIds.length,
        reservationCount: divisionReservations.length,
        activeReservations: divisionReservations.filter(
          (reservation) => reservation.status !== ReservationStatus.Returned
        ).length,
        borrowedParts: divisionReservations.filter(
          (reservation) => reservation.status === ReservationStatus.Borrowed
        ).length,
      }
    })
  }

  private getBorrowedPartsByGroup(
    collaborators: Collaborator[],
    reservations: Reservation[]
  ) {
    return Object.values(CollaboratorGroup).map((group) => {
      const groupCollaboratorIds = collaborators
        .filter((collaborator) => collaborator.group === group)
        .map((collaborator) => collaborator.id)
      const groupReservations = reservations.filter((reservation) =>
        groupCollaboratorIds.includes(reservation.collaboratorId)
      )
      const borrowedCount = groupReservations.filter(
        (reservation) => reservation.status === ReservationStatus.Borrowed
      ).length

      return {
        group,
        collaborators: groupCollaboratorIds.length,
        reservationCount: groupReservations.length,
        activeReservations: groupReservations.filter(
          (reservation) => reservation.status !== ReservationStatus.Returned
        ).length,
        borrowedCount,
        borrowedParts: borrowedCount,
      }
    })
  }

  private getActiveBorrowers(
    collaborators: Collaborator[],
    reservations: Reservation[]
  ) {
    return collaborators.filter((collaborator) =>
      reservations.some(
        (reservation) =>
          reservation.collaboratorId === collaborator.id &&
          reservation.status === ReservationStatus.Borrowed
      )
    ).length
  }
}
