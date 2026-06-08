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
  PartRequest,
  RequestStatus,
  RequestType,
} from "../requests/part-request.entity"
import { SettingsService } from "../settings/settings.service"

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>,
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>,
    @InjectRepository(PartRequest)
    private readonly requestsRepository: Repository<PartRequest>,
    private readonly settingsService: SettingsService
  ) {}

  async getSummary() {
    const [parts, collaborators, requests, lowStockThreshold] = await Promise.all([
      this.partsRepository.find(),
      this.collaboratorsRepository.find(),
      this.requestsRepository.find({ relations: ["part", "collaborator"] }),
      this.settingsService.getLowStockThreshold(),
    ])

    const lowStockItems = parts.filter(
      (part) =>
        part.availableQuantity <= lowStockThreshold &&
        part.availableQuantity > 0
    )
    const operationalRequests = requests.filter((request) =>
      this.isOperationalRequest(request)
    )
    const reservedQuantity = this.sumStatusQuantity(
      requests,
      RequestStatus.Reserved
    )
    const borrowedQuantity = this.sumStatusQuantity(
      requests,
      RequestStatus.Borrowed
    )

    return {
      totalParts: parts.length,
      availableParts: parts.reduce(
        (total, part) => total + part.availableQuantity,
        0
      ),
      borrowedParts: borrowedQuantity,
      reservedParts: reservedQuantity,
      damagedParts: parts.reduce(
        (total, part) => total + part.damagedQuantity,
        0
      ),
      lowStockParts: lowStockItems.length,
      lowStockItems,
      totalCollaborators: collaborators.length,
      activeBorrowers: this.getActiveBorrowers(collaborators, requests),
      totalReservations: operationalRequests.length,
      reservedReservations: this.countStatus(requests, RequestStatus.Reserved),
      borrowedReservations: this.countStatus(requests, RequestStatus.Borrowed),
      returnedReservations: this.countStatus(requests, RequestStatus.Returned),
      damagedReservations: this.countStatus(requests, RequestStatus.Damaged),
      pendingReservations: this.countStatus(requests, RequestStatus.Pending),
      mostBorrowedParts: this.getMostBorrowedParts(operationalRequests),
      mostActiveCollaborators: this.getMostActiveCollaborators(
        collaborators,
        operationalRequests
      ),
      inventoryByCategory: this.getInventoryByCategory(parts),
      reservationsByDivision: this.getReservationsByDivision(
        collaborators,
        operationalRequests
      ),
      borrowedPartsByGroup: this.getBorrowedPartsByGroup(
        collaborators,
        operationalRequests
      ),
    }
  }

  private countStatus(requests: PartRequest[], status: RequestStatus) {
    return requests.filter((request) => request.status === status).length
  }

  private sumStatusQuantity(requests: PartRequest[], status: RequestStatus) {
    return requests
      .filter((request) => request.status === status)
      .reduce((total, request) => total + request.quantity, 0)
  }

  private getMostBorrowedParts(requests: PartRequest[]) {
    const counts = requests
      .filter((request) => request.requestType === RequestType.Borrow)
      .reduce<Record<string, number>>((partCounts, request) => {
        const partName = request.part?.name || "Unknown part"
        partCounts[partName] = (partCounts[partName] || 0) + 1
        return partCounts
      }, {})

    return Object.entries(counts)
      .map(([partName, borrowCount]) => ({ partName, borrowCount }))
      .sort((a, b) => b.borrowCount - a.borrowCount)
      .slice(0, 10)
  }

  private getMostActiveCollaborators(
    collaborators: Collaborator[],
    requests: PartRequest[]
  ) {
    return collaborators
      .map((collaborator) => {
        const collaboratorRequests = requests.filter(
          (request) => request.collaboratorId === collaborator.id
        )

        return {
          collaboratorName: collaborator.name,
          reservationCount: collaboratorRequests.length,
          borrowedCount: collaboratorRequests.filter(
            (request) => request.status === RequestStatus.Borrowed
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
    requests: PartRequest[]
  ) {
    return Object.values(Division).map((division) => {
      const divisionCollaboratorIds = collaborators
        .filter((collaborator) => collaborator.division === division)
        .map((collaborator) => collaborator.id)
      const divisionRequests = requests.filter((request) =>
        divisionCollaboratorIds.includes(request.collaboratorId)
      )
      const reservedRequests = divisionRequests.filter(
        (request) => request.status === RequestStatus.Reserved
      )
      const borrowedRequests = divisionRequests.filter(
        (request) => request.status === RequestStatus.Borrowed
      )
      const returnedRequests = divisionRequests.filter(
        (request) => request.status === RequestStatus.Returned
      )
      const damagedRequests = divisionRequests.filter(
        (request) => request.status === RequestStatus.Damaged
      )

      return {
        division,
        collaborators: divisionCollaboratorIds.length,
        reservationCount: reservedRequests.length + borrowedRequests.length,
        activeReservations: reservedRequests.reduce(
          (total, request) => total + request.quantity,
          0
        ),
        borrowedParts: borrowedRequests.reduce(
          (total, request) => total + request.quantity,
          0
        ),
        returnedParts: returnedRequests.reduce(
          (total, request) => total + request.quantity,
          0
        ),
        damagedParts: damagedRequests.reduce(
          (total, request) => total + request.quantity,
          0
        ),
      }
    })
  }

  private getBorrowedPartsByGroup(
    collaborators: Collaborator[],
    requests: PartRequest[]
  ) {
    return Object.values(CollaboratorGroup).map((group) => {
      const groupCollaboratorIds = collaborators
        .filter((collaborator) => collaborator.group === group)
        .map((collaborator) => collaborator.id)
      const groupRequests = requests.filter((request) =>
        groupCollaboratorIds.includes(request.collaboratorId)
      )
      const reservedRequests = groupRequests.filter(
        (request) => request.status === RequestStatus.Reserved
      )
      const borrowedRequests = groupRequests.filter(
        (request) => request.status === RequestStatus.Borrowed
      )
      const returnedRequests = groupRequests.filter(
        (request) => request.status === RequestStatus.Returned
      )
      const damagedRequests = groupRequests.filter(
        (request) => request.status === RequestStatus.Damaged
      )
      const borrowedParts = borrowedRequests.reduce(
        (total, request) => total + request.quantity,
        0
      )

      return {
        group,
        collaborators: groupCollaboratorIds.length,
        reservationCount: reservedRequests.length + borrowedRequests.length,
        activeReservations: reservedRequests.reduce(
          (total, request) => total + request.quantity,
          0
        ),
        borrowedCount: borrowedRequests.length,
        borrowedParts,
        returnedParts: returnedRequests.reduce(
          (total, request) => total + request.quantity,
          0
        ),
        damagedParts: damagedRequests.reduce(
          (total, request) => total + request.quantity,
          0
        ),
      }
    })
  }

  private getActiveBorrowers(
    collaborators: Collaborator[],
    requests: PartRequest[]
  ) {
    return collaborators.filter((collaborator) =>
      requests.some(
        (request) =>
          request.collaboratorId === collaborator.id &&
          request.status === RequestStatus.Borrowed
      )
    ).length
  }

  private isOperationalRequest(request: PartRequest) {
    return [
      RequestStatus.Reserved,
      RequestStatus.Borrowed,
      RequestStatus.ReturnPending,
      RequestStatus.Returned,
      RequestStatus.Damaged,
    ].includes(request.status)
  }
}
