import { Injectable, NotFoundException } from "@nestjs/common"
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
import { Notification, NotificationType } from "./notification.entity"
import { NotificationSeen } from "./notification-seen.entity"

export type CreateNotificationInput = {
  title: string
  message: string
  type: NotificationType
  targetPage: string
  targetSection?: string | null
  targetId?: number | null
  isActionable?: boolean
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(NotificationSeen)
    private readonly notificationSeenRepository: Repository<NotificationSeen>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(PartRequest)
    private readonly partRequestsRepository: Repository<PartRequest>,
    @InjectRepository(MissingItemRequest)
    private readonly missingItemRequestsRepository: Repository<MissingItemRequest>,
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>
  ) {}

  async findAll(user: AuthenticatedUser) {
    return this.notificationsRepository.find({
      where: { recipientUserId: user.id },
      order: { isRead: "ASC", createdAt: "DESC" },
    })
  }

  async getSummary(user: AuthenticatedUser) {
    if (user.role === UserRole.Admin) {
      await this.createPendingPurchaseReminders()
    }

    const [items, counts] = await Promise.all([
      this.findAll(user),
      this.getWorkflowCounts(user),
    ])
    const unreadItems = items.filter((item) => !item.isRead)

    return {
      totalUnread: unreadItems.length,
      counts: {
        ...counts,
        unread: unreadItems.length,
        actionable: unreadItems.filter((item) => item.isActionable).length,
        pendingRequests:
          counts.pendingPartRequests + counts.pendingMissingItemRequests,
        pendingPurchases: counts.pendingPurchaseRequests,
        pendingReturns: counts.pendingReturnConfirmations,
        informationalUpdates: unreadItems.filter((item) => !item.isActionable)
          .length,
      },
      ...counts,
      informationalUpdates: unreadItems.filter((item) => !item.isActionable)
        .length,
      items: items.slice(0, 50).map((item) => this.toResponse(item)),
    }
  }

  async markRead(id: number, user: AuthenticatedUser) {
    const notification = await this.findOwned(id, user.id)
    notification.isRead = true
    await this.notificationsRepository.save(notification)
    return this.getSummary(user)
  }

  async markAllRead(user: AuthenticatedUser) {
    await this.notificationsRepository.update(
      { recipientUserId: user.id, isRead: false },
      { isRead: true }
    )
    return this.getSummary(user)
  }

  async remove(id: number, user: AuthenticatedUser) {
    const notification = await this.findOwned(id, user.id)
    await this.notificationsRepository.remove(notification)
    return this.getSummary(user)
  }

  async clearRead(user: AuthenticatedUser) {
    await this.notificationsRepository.delete({
      recipientUserId: user.id,
      isRead: true,
    })
    return this.getSummary(user)
  }

  async notifyAdmins(input: CreateNotificationInput, excludeUserId?: number) {
    const admins = await this.usersRepository.find({
      where: { role: UserRole.Admin },
    })
    return this.createForUsers(
      admins.filter((admin) => admin.id !== excludeUserId).map((admin) => admin.id),
      input
    )
  }

  async notifyManagersAndAdmins(
    division: Division,
    input: CreateNotificationInput
  ) {
    const users = await this.usersRepository.find()
    const recipientIds = users
      .filter(
        (user) =>
          user.role === UserRole.Admin ||
          (user.role === UserRole.InventoryManager &&
            (user.managedDivision || user.division) === division)
      )
      .map((user) => user.id)

    return this.createForUsers(recipientIds, input)
  }

  async notifyUser(userId: number, input: CreateNotificationInput) {
    return this.createForUsers([userId], input)
  }

  async notifyCollaboratorEmail(
    email: string | undefined,
    input: CreateNotificationInput
  ) {
    if (!email) {
      return []
    }

    const user = await this.usersRepository
      .createQueryBuilder("user")
      .where("LOWER(user.email) = LOWER(:email)", { email })
      .getOne()

    return user ? this.createForUsers([user.id], input) : []
  }

  async notifyCollaboratorForReceivedPurchase(purchase: Purchase) {
    const requests = await this.missingItemRequestsRepository.find({
      relations: { collaborator: true },
    })
    const reference = purchase.reference.trim().toLowerCase()
    const itemName = purchase.itemName.trim().toLowerCase()
    const matches = requests.filter(
      (request) =>
        request.status === RequestStatus.Approved &&
        request.collaborator?.division === purchase.division &&
        ((reference &&
          request.reference?.trim().toLowerCase() === reference) ||
          request.itemName.trim().toLowerCase() === itemName)
    )

    for (const request of matches) {
      await this.notifyCollaboratorEmail(request.collaborator?.email, {
        title: "Requested item received",
        message: `${purchase.itemName} has been received and is available.`,
        type: NotificationType.PurchaseRequestReceived,
        targetPage: "My Requests",
        targetSection: "MyMissingItemRequests",
        targetId: request.id,
      })
    }
  }

  async resolveActionable(targetPage: string, targetId: number) {
    await this.notificationsRepository.update(
      { targetPage, targetId, isActionable: true },
      { isActionable: false }
    )
  }

  private async createForUsers(
    userIds: number[],
    input: CreateNotificationInput
  ) {
    const uniqueIds = [...new Set(userIds)]
    if (uniqueIds.length === 0) {
      return []
    }

    return this.notificationsRepository.save(
      uniqueIds.map((recipientUserId) =>
        this.notificationsRepository.create({
          recipientUserId,
          title: input.title,
          message: input.message,
          type: input.type,
          targetPage: input.targetPage,
          targetSection: input.targetSection || null,
          targetId: input.targetId || null,
          isActionable: input.isActionable || false,
        })
      )
    )
  }

  private async createPendingPurchaseReminders() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const purchases = await this.purchasesRepository.find({
      where: { status: PurchaseStatus.Pending },
    })

    for (const purchase of purchases) {
      if (
        purchase.createdAt > cutoff ||
        (purchase.lastReminderAt && purchase.lastReminderAt > cutoff)
      ) {
        continue
      }

      await this.notifyAdmins({
        title: "Pending purchase reminder",
        message: `Purchase request for ${purchase.itemName} is still pending approval.`,
        type: NotificationType.PurchaseReminder,
        targetPage: "Purchase",
        targetSection: "PurchaseRequests",
        targetId: purchase.id,
        isActionable: true,
      })
      purchase.lastReminderAt = new Date()
      await this.purchasesRepository.save(purchase)
    }
  }

  private async getWorkflowCounts(user: AuthenticatedUser) {
    let pendingUserVerifications = 0
    let partRequests: PartRequest[] = []
    let missingRequests: MissingItemRequest[] = []
    let pendingPurchaseRequests = 0

    if (user.role === UserRole.Admin) {
      ;[pendingUserVerifications, partRequests, missingRequests, pendingPurchaseRequests] =
        await Promise.all([
          this.usersRepository.count({
            where: {
              emailVerificationStatus: EmailVerificationStatus.Pending,
            },
          }),
          this.partRequestsRepository.find({
            where: [
              { status: RequestStatus.Pending },
              { status: RequestStatus.ReturnPending },
            ],
            relations: { collaborator: true },
          }),
          this.missingItemRequestsRepository.find({
            where: { status: RequestStatus.Pending },
            relations: { collaborator: true },
          }),
          this.purchasesRepository.count({
            where: { status: PurchaseStatus.Pending },
          }),
        ])
    } else if (user.role === UserRole.InventoryManager) {
      const managedDivision = user.managedDivision || user.division
      ;[partRequests, missingRequests] = await Promise.all([
        this.partRequestsRepository.find({
          where: [
            { status: RequestStatus.Pending },
            { status: RequestStatus.ReturnPending },
          ],
          relations: { collaborator: true },
        }),
        this.missingItemRequestsRepository.find({
          where: { status: RequestStatus.Pending },
          relations: { collaborator: true },
        }),
      ])
      partRequests = partRequests.filter(
        (request) => request.collaborator?.division === managedDivision
      )
      missingRequests = missingRequests.filter(
        (request) => request.collaborator?.division === managedDivision
      )
    }

    return {
      pendingUserVerifications,
      pendingPartRequests: partRequests.filter(
        (request) => request.status === RequestStatus.Pending
      ).length,
      pendingMissingItemRequests: missingRequests.length,
      pendingPurchaseRequests,
      pendingReturnConfirmations: partRequests.filter(
        (request) => request.status === RequestStatus.ReturnPending
      ).length,
    }
  }

  private async findOwned(id: number, userId: number) {
    const notification = await this.notificationsRepository.findOne({
      where: { id, recipientUserId: userId },
    })
    if (!notification) {
      throw new NotFoundException("Notification not found")
    }
    return notification
  }

  private toResponse(notification: Notification) {
    return {
      ...notification,
      id: String(notification.id),
      description: notification.message,
      actionable: notification.isActionable,
    }
  }
}
