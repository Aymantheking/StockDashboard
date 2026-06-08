import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { AuthenticatedUser } from "../../common/authenticated-request"
import { Collaborator, Division } from "../collaborators/collaborator.entity"
import { MissingItemRequest } from "../missing-item-requests/missing-item-request.entity"
import { Purchase, PurchaseStatus } from "../purchases/purchase.entity"
import { PartRequest, RequestStatus } from "../requests/part-request.entity"
import {
  EmailVerificationStatus,
  User,
  UserRole,
} from "../users/user.entity"
import { NotificationSeen } from "./notification-seen.entity"

type NotificationItem = {
  id: string
  type:
    | "UserVerification"
    | "PartRequest"
    | "MissingItemRequest"
    | "PurchaseRequest"
    | "ReturnConfirmation"
    | "RequestUpdate"
  title: string
  description: string
  targetPage: string
  targetSection?: string
  targetId?: number
  createdAt?: Date
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(PartRequest)
    private readonly partRequestsRepository: Repository<PartRequest>,
    @InjectRepository(MissingItemRequest)
    private readonly missingItemRequestsRepository: Repository<MissingItemRequest>,
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>,
    @InjectRepository(NotificationSeen)
    private readonly notificationSeenRepository: Repository<NotificationSeen>
  ) {}

  async getSummary(user: AuthenticatedUser) {
    if (user.role === UserRole.Admin || user.role === UserRole.InventoryManager) {
      return this.getManagerSummary(user)
    }

    if (user.role === UserRole.Collaborator) {
      return this.getCollaboratorSummary(user)
    }

    return this.emptySummary([])
  }

  async markAllSeen(user: AuthenticatedUser) {
    if (user.role !== UserRole.Collaborator) {
      return this.getSummary(user)
    }

    const summary = await this.getCollaboratorSummary(user, false)
    if (summary.items.length > 0) {
      await this.notificationSeenRepository.upsert(
        summary.items.map((item) => ({
          userId: user.id,
          notificationId: item.id,
        })),
        ["userId", "notificationId"]
      )
    }

    return this.getCollaboratorSummary(user)
  }

  private async getManagerSummary(user: AuthenticatedUser) {
    const [users, partRequests, missingItemRequests, purchases] =
      await Promise.all([
        user.role === UserRole.Admin
          ? this.usersRepository.find({
              where: {
                emailVerificationStatus: EmailVerificationStatus.Pending,
              },
              order: { id: "DESC" },
            })
          : Promise.resolve([]),
        this.partRequestsRepository.find({
          where: [
            { status: RequestStatus.Pending },
            { status: RequestStatus.ReturnPending },
          ],
          relations: { collaborator: true, part: true },
          order: { id: "DESC" },
        }),
        this.missingItemRequestsRepository.find({
          where: { status: RequestStatus.Pending },
          relations: { collaborator: true },
          order: { id: "DESC" },
        }),
        this.purchasesRepository.find({
          where: { status: PurchaseStatus.Pending },
          order: { id: "DESC" },
        }),
      ])

    const managedDivision = user.managedDivision || user.division
    const scopedPartRequests =
      user.role === UserRole.Admin
        ? partRequests
        : partRequests.filter(
            (request) => request.collaborator?.division === managedDivision
          )
    const scopedMissingItemRequests =
      user.role === UserRole.Admin
        ? missingItemRequests
        : missingItemRequests.filter(
            (request) => request.collaborator?.division === managedDivision
          )
    const scopedPurchases =
      user.role === UserRole.Admin
        ? purchases
        : purchases.filter((purchase) => purchase.division === managedDivision)

    const pendingPartRequests = scopedPartRequests.filter(
      (request) => request.status === RequestStatus.Pending
    )
    const pendingReturnConfirmations = scopedPartRequests.filter(
      (request) => request.status === RequestStatus.ReturnPending
    )

    const items: NotificationItem[] = [
      ...users.map((pendingUser) => ({
        id: `user-verification-${pendingUser.id}`,
        type: "UserVerification" as const,
        title: "New user verification required",
        description: `${pendingUser.email} is waiting for verification`,
        targetPage: "Settings",
        targetSection: "UserVerification",
        targetId: pendingUser.id,
        createdAt: pendingUser.createdAt,
      })),
      ...pendingPartRequests.map((request) => ({
        id: `part-request-${request.id}`,
        type: "PartRequest" as const,
        title: "New part request",
        description: `${request.collaborator?.name || "Collaborator"} requested ${request.part?.name || "a part"}`,
        targetPage: "Requests",
        targetSection: "PartRequests",
        targetId: request.id,
        createdAt: request.createdAt,
      })),
      ...pendingReturnConfirmations.map((request) => ({
        id: `return-confirmation-${request.id}`,
        type: "ReturnConfirmation" as const,
        title: "Return confirmation required",
        description: `${request.collaborator?.name || "Collaborator"} declared ${request.part?.name || "a part"} returned`,
        targetPage: "Requests",
        targetSection: "PartRequests",
        targetId: request.id,
        createdAt: request.updatedAt,
      })),
      ...scopedMissingItemRequests.map((request) => ({
        id: `missing-item-request-${request.id}`,
        type: "MissingItemRequest" as const,
        title: "New missing item request",
        description: `${request.collaborator?.name || "Collaborator"} requested ${request.itemName}`,
        targetPage: "Requests",
        targetSection: "MissingItemRequests",
        targetId: request.id,
        createdAt: request.createdAt,
      })),
      ...scopedPurchases.map((purchase) => ({
        id: `purchase-request-${purchase.id}`,
        type: "PurchaseRequest" as const,
        title: "New purchase request",
        description: `${purchase.itemName} purchase request is pending`,
        targetPage: "Purchase",
        targetSection: "PurchaseRequests",
        targetId: purchase.id,
        createdAt: purchase.createdAt,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )

    return this.buildSummary({
      pendingUserVerifications: users.length,
      pendingPartRequests: pendingPartRequests.length,
      pendingMissingItemRequests: scopedMissingItemRequests.length,
      pendingPurchaseRequests: scopedPurchases.length,
      pendingReturnConfirmations: pendingReturnConfirmations.length,
      items,
    })
  }

  private buildSummary({
    pendingUserVerifications,
    pendingPartRequests,
    pendingMissingItemRequests,
    pendingPurchaseRequests,
    pendingReturnConfirmations,
    items,
  }: {
    pendingUserVerifications: number
    pendingPartRequests: number
    pendingMissingItemRequests: number
    pendingPurchaseRequests: number
    pendingReturnConfirmations: number
    items: NotificationItem[]
  }) {
    const counts = {
      pendingUserVerifications,
      pendingPartRequests,
      pendingMissingItemRequests,
      pendingPurchaseRequests,
      pendingReturnConfirmations,
    }

    return {
      totalUnread: items.length,
      counts,
      ...counts,
      items,
    }
  }

  private async getCollaboratorSummary(
    user: AuthenticatedUser,
    excludeSeen = true
  ) {
    const collaborator = await this.collaboratorsRepository.findOne({
      where: { email: user.email },
    })

    if (!collaborator) {
      return this.emptySummary([])
    }

    const [partRequests, missingItemRequests] = await Promise.all([
      this.partRequestsRepository.find({
        where: { collaboratorId: collaborator.id },
        relations: { part: true },
        order: { id: "DESC" },
      }),
      this.missingItemRequestsRepository.find({
        where: { collaboratorId: collaborator.id },
        order: { id: "DESC" },
      }),
    ])

    const actionableStatuses = [
      RequestStatus.Approved,
      RequestStatus.Rejected,
      RequestStatus.Borrowed,
      RequestStatus.Reserved,
      RequestStatus.ReturnPending,
      RequestStatus.Returned,
      RequestStatus.Damaged,
    ]
    const partUpdates = partRequests.filter(
      (request) =>
        actionableStatuses.includes(request.status) || Boolean(request.managerComment)
    )
    const missingUpdates = missingItemRequests.filter(
      (request) =>
        actionableStatuses.includes(request.status) || Boolean(request.managerComment)
    )

    let items: NotificationItem[] = [
      ...partUpdates.map((request) => ({
        id: `part-request-update-${request.id}-${request.status}`,
        type: "RequestUpdate" as const,
        title: `Part request ${request.status}`,
        description:
          request.managerComment ||
          `${request.part?.name || "Part request"} was updated`,
        targetPage: "My Requests",
        targetSection: "MyPartRequests",
        targetId: request.id,
        createdAt: request.updatedAt,
      })),
      ...missingUpdates.map((request) => ({
        id: `missing-item-update-${request.id}-${request.status}`,
        type: "RequestUpdate" as const,
        title: `Missing item request ${request.status}`,
        description: request.managerComment || `${request.itemName} was updated`,
        targetPage: "My Requests",
        targetSection: "MyMissingItemRequests",
        targetId: request.id,
        createdAt: request.updatedAt,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    )

    if (excludeSeen && items.length > 0) {
      const seenItems = await this.notificationSeenRepository.find({
        where: { userId: user.id },
      })
      const seenIds = new Set(seenItems.map((item) => item.notificationId))
      items = items.filter((item) => !seenIds.has(item.id))
    }

    return this.buildSummary({
      pendingUserVerifications: 0,
      pendingPartRequests: 0,
      pendingMissingItemRequests: 0,
      pendingPurchaseRequests: 0,
      pendingReturnConfirmations: 0,
      items,
    })
  }

  private emptySummary(items: NotificationItem[]) {
    return this.buildSummary({
      pendingUserVerifications: 0,
      pendingPartRequests: 0,
      pendingMissingItemRequests: 0,
      pendingPurchaseRequests: 0,
      pendingReturnConfirmations: 0,
      items,
    })
  }
}
