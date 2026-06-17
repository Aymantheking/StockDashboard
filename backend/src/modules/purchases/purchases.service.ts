import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { AuthenticatedUser } from "../../common/authenticated-request"
import { Division } from "../collaborators/collaborator.entity"
import { Part } from "../parts/part.entity"
import { NotificationType } from "../notifications/notification.entity"
import { NotificationsService } from "../notifications/notifications.service"
import { User, UserRole } from "../users/user.entity"
import { Purchase, PurchasePriority, PurchaseStatus } from "./purchase.entity"

type PurchaseInput = {
  sourcePartId?: number | null
  sourceMissingItemRequestId?: number | null
  itemName: string
  category: string
  manufacturer?: string
  reference?: string
  quantity: number
  reason: string
  priority: PurchasePriority
  division?: Division
  supplierName?: string
  supplierContact?: string
  unitPrice?: number
  totalPrice?: number
  expectedArrivalDate?: string
  adminComment?: string
}

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService
  ) {}

  async findAll(user: AuthenticatedUser) {
    if (user.role === UserRole.Admin) {
      return this.purchasesRepository.find({ order: { id: "DESC" } })
    }

    return this.purchasesRepository.find({
      where: { division: this.getManagerDivision(user) },
      order: { id: "DESC" },
    })
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const purchase = await this.purchasesRepository.findOne({ where: { id } })

    if (!purchase) {
      throw new NotFoundException(`Purchase with id ${id} not found`)
    }

    this.assertCanView(purchase, user)
    return purchase
  }

  async create(input: PurchaseInput, user: AuthenticatedUser) {
    this.validateInput(input)
    const itemName = input.itemName.trim()
    const reference = input.reference?.trim() || ""
    const sourcePart = input.sourcePartId
      ? await this.partsRepository.findOne({ where: { id: input.sourcePartId } })
      : null

    if (input.sourcePartId && !sourcePart) {
      throw new NotFoundException("Source inventory part not found")
    }

    if (
      sourcePart &&
      (sourcePart.name !== itemName ||
        sourcePart.category !== input.category.trim() ||
        sourcePart.manufacturer !== (input.manufacturer?.trim() || "") ||
        sourcePart.reference !== reference)
    ) {
      throw new BadRequestException(
        "Inventory purchase identity must match the source part"
      )
    }
    const division =
      user.role === UserRole.Admin
        ? input.division || Division.Admin
        : this.getManagerDivision(user)
    const existingPurchase = await this.purchasesRepository
      .createQueryBuilder("purchase")
      .where("LOWER(purchase.itemName) = LOWER(:itemName)", { itemName })
      .andWhere("LOWER(purchase.reference) = LOWER(:reference)", { reference })
      .andWhere("purchase.division = :division", { division })
      .andWhere("purchase.requestedById = :requestedById", {
        requestedById: user.id,
      })
      .andWhere("purchase.sourcePartId IS NOT DISTINCT FROM :sourcePartId", {
        sourcePartId: sourcePart?.id || null,
      })
      .andWhere("purchase.status = :status", {
        status: PurchaseStatus.Pending,
      })
      .getOne()

    if (existingPurchase) {
      existingPurchase.quantity += input.quantity
      existingPurchase.reason = this.mergeReason(
        existingPurchase.reason,
        input.reason.trim()
      )
      existingPurchase.totalPrice =
        existingPurchase.unitPrice > 0
          ? existingPurchase.unitPrice * existingPurchase.quantity
          : existingPurchase.totalPrice + Number(input.totalPrice || 0)

      if (input.supplierName?.trim()) {
        existingPurchase.supplierName = input.supplierName.trim()
      }
      if (input.supplierContact?.trim()) {
        existingPurchase.supplierContact = input.supplierContact.trim()
      }

      const savedPurchase =
        await this.purchasesRepository.save(existingPurchase)
      if (user.role !== UserRole.Admin) {
        await this.notifyPurchaseCreated(savedPurchase, user)
      }
      return savedPurchase
    }

    const purchase = this.purchasesRepository.create({
      itemName,
      category: input.category.trim(),
      manufacturer: input.manufacturer?.trim() || "",
      reference,
      quantity: input.quantity,
      reason: input.reason.trim(),
      priority: input.priority,
      requestedById: user.id,
      sourcePartId: sourcePart?.id || null,
      sourceMissingItemRequestId: input.sourceMissingItemRequestId || null,
      division,
      supplierName: input.supplierName?.trim() || "",
      supplierContact: input.supplierContact?.trim() || "",
      unitPrice: Number(input.unitPrice || 0),
      totalPrice: Number(input.totalPrice || 0),
      expectedArrivalDate: input.expectedArrivalDate || null,
      adminComment: input.adminComment?.trim() || "",
      status: PurchaseStatus.Pending,
      receivedDate: null,
    })

    const savedPurchase = await this.purchasesRepository.save(purchase)
    if (user.role !== UserRole.Admin) {
      await this.notifyPurchaseCreated(savedPurchase, user)
    }
    return savedPurchase
  }

  async update(id: number, input: Partial<PurchaseInput>, user: AuthenticatedUser) {
    const purchase = await this.findOne(id, user)
    this.assertCanUpdatePurchase(purchase, input, user)
    const safeInput = this.getDefinedPurchaseInput(input)

    const updatedPurchase = {
      ...purchase,
      ...safeInput,
      quantity: input.quantity === undefined ? purchase.quantity : input.quantity,
      unitPrice:
        input.unitPrice === undefined ? purchase.unitPrice : Number(input.unitPrice),
      totalPrice:
        input.totalPrice === undefined
          ? purchase.totalPrice
          : Number(input.totalPrice),
      expectedArrivalDate:
        input.expectedArrivalDate === undefined
          ? purchase.expectedArrivalDate
          : input.expectedArrivalDate || null,
    }

    this.validateInput(updatedPurchase)
    return this.purchasesRepository.save(updatedPurchase)
  }

  async markOrdered(id: number, input: Partial<PurchaseInput>, user: AuthenticatedUser) {
    const currentPurchase = await this.findOne(id, user)
    if (currentPurchase.status === PurchaseStatus.Pending) {
      const requester = await this.usersRepository.findOne({
        where: { id: currentPurchase.requestedById },
      })
      if (requester?.role !== UserRole.Admin) {
        throw new BadRequestException(
          "Manager-created purchase requests must be approved before ordering"
        )
      }
    } else {
      this.assertStatus(currentPurchase, PurchaseStatus.Approved, "order")
    }
    const purchase = await this.applyAdminWorkflowUpdate(
      currentPurchase,
      input
    )
    purchase.status = PurchaseStatus.Ordered
    const savedPurchase = await this.purchasesRepository.save(purchase)
    await this.notifyRequester(savedPurchase, NotificationType.PurchaseRequestOrdered)
    return savedPurchase
  }

  async approve(id: number, input: Partial<PurchaseInput>, user: AuthenticatedUser) {
    const currentPurchase = await this.findOne(id, user)
    this.assertStatus(currentPurchase, PurchaseStatus.Pending, "approve")
    if (currentPurchase.requestedById === user.id) {
      throw new ForbiddenException(
        "You cannot approve your own purchase request."
      )
    }
    const purchase = await this.applyAdminWorkflowUpdate(
      currentPurchase,
      input
    )
    purchase.status = PurchaseStatus.Approved
    const savedPurchase = await this.purchasesRepository.save(purchase)
    await this.notificationsService.resolveActionable("Purchase", purchase.id)
    await this.notifyRequester(
      savedPurchase,
      NotificationType.PurchaseRequestApproved
    )
    return savedPurchase
  }

  async markInTransit(
    id: number,
    input: Partial<PurchaseInput>,
    user: AuthenticatedUser
  ) {
    const currentPurchase = await this.findOne(id, user)
    this.assertStatus(currentPurchase, PurchaseStatus.Ordered, "mark in transit")
    const purchase = await this.applyAdminWorkflowUpdate(
      currentPurchase,
      input,
      true
    )
    purchase.status = PurchaseStatus.InTransit
    const savedPurchase = await this.purchasesRepository.save(purchase)
    await this.notifyRequester(
      savedPurchase,
      NotificationType.PurchaseRequestInTransit
    )
    return savedPurchase
  }

  async receive(id: number, input: Partial<PurchaseInput>, user: AuthenticatedUser) {
    const currentPurchase = await this.findOne(id, user)
    this.assertStatus(currentPurchase, PurchaseStatus.InTransit, "receive")
    const purchase = await this.applyAdminWorkflowUpdate(
      currentPurchase,
      input,
      true
    )
    this.validateReceiveRequirements(purchase)

    const existingPart = purchase.reference
      ? await this.partsRepository.findOne({
          where: { reference: purchase.reference },
        })
      : null

    if (existingPart) {
      existingPart.totalQuantity += purchase.quantity
      existingPart.availableQuantity += purchase.quantity
      this.syncLegacyPartFields(existingPart)
      await this.partsRepository.save(existingPart)
    } else {
      await this.partsRepository.save(
        this.partsRepository.create({
          name: purchase.itemName,
          category: purchase.category,
          manufacturer: purchase.manufacturer,
          reference: purchase.reference || "",
          totalQuantity: purchase.quantity,
          availableQuantity: purchase.quantity,
          reservedQuantity: 0,
          borrowedQuantity: 0,
          damagedQuantity: 0,
          quantity: purchase.quantity,
          location: "Receiving Area",
          description: purchase.reason,
          stockAllocationNote: "",
          status: "Available",
        })
      )
    }

    purchase.status = PurchaseStatus.Received
    purchase.receivedDate = new Date().toISOString().slice(0, 10)
    const savedPurchase = await this.purchasesRepository.save(purchase)
    await this.notifyRequester(
      savedPurchase,
      NotificationType.PurchaseRequestReceived
    )
    await this.notificationsService.notifyCollaboratorForReceivedPurchase(
      savedPurchase
    )
    return savedPurchase
  }

  private validateReceiveRequirements(purchase: Purchase) {
    const missingFields: string[] = []

    if (!purchase.supplierName.trim()) {
      missingFields.push("supplier")
    }
    if (!purchase.supplierContact.trim()) {
      missingFields.push("supplier contact")
    }
    if (Number(purchase.unitPrice) <= 0) {
      missingFields.push("unit price")
    }
    if (Number(purchase.totalPrice) <= 0) {
      missingFields.push("total price")
    }
    if (!purchase.expectedArrivalDate) {
      missingFields.push("arrival date")
    }
    if (Number(purchase.quantity) <= 0) {
      missingFields.push("quantity")
    }
    if (!purchase.reference.trim() && !purchase.itemName.trim()) {
      missingFields.push("reference or item name")
    }

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Purchase cannot be received. Missing: ${missingFields.join(", ")}`
      )
    }
  }

  async cancel(id: number, input: { adminComment?: string }, user: AuthenticatedUser) {
    const purchase = await this.findOne(id, user)
    const canAdminCancel =
      user.role === UserRole.Admin &&
      [
        PurchaseStatus.Pending,
        PurchaseStatus.Approved,
        PurchaseStatus.Ordered,
        PurchaseStatus.InTransit,
      ].includes(purchase.status)
    const canManagerCancel =
      user.role === UserRole.InventoryManager &&
      purchase.requestedById === user.id &&
      purchase.status === PurchaseStatus.Pending

    if (!canAdminCancel && !canManagerCancel) {
      throw new BadRequestException(
        `Cannot cancel a ${purchase.status.toLowerCase()} purchase`
      )
    }

    purchase.status = PurchaseStatus.Cancelled
    purchase.adminComment = input.adminComment || purchase.adminComment
    return this.purchasesRepository.save(purchase)
  }

  async remove(id: number, user: AuthenticatedUser) {
    const purchase = await this.findOne(id, user)

    if (user.role !== UserRole.Admin) {
      throw new ForbiddenException(
        `Cannot delete a ${purchase.status.toLowerCase()} purchase`
      )
    }

    await this.purchasesRepository.remove(purchase)
    return { deleted: true }
  }

  private validateInput(input: Partial<PurchaseInput | Purchase>) {
    if (!input.itemName?.trim()) {
      throw new BadRequestException("itemName is required")
    }

    if (!input.category?.trim()) {
      throw new BadRequestException("category is required")
    }

    if (!Number.isInteger(Number(input.quantity)) || Number(input.quantity) <= 0) {
      throw new BadRequestException("quantity must be greater than 0")
    }

    if (!input.reason?.trim()) {
      throw new BadRequestException("reason is required")
    }

    if (
      input.priority &&
      !Object.values(PurchasePriority).includes(input.priority as PurchasePriority)
    ) {
      throw new BadRequestException("priority is invalid")
    }

    if (this.isPastDate(input.expectedArrivalDate || undefined)) {
      throw new BadRequestException("Date cannot be in the past")
    }
  }

  private isPastDate(value?: string) {
    if (!value) {
      return false
    }

    return value < new Date().toISOString().slice(0, 10)
  }

  private getManagerDivision(user: AuthenticatedUser) {
    const division = user.managedDivision || user.division

    if (!division || division === Division.Admin) {
      throw new ForbiddenException("manager division is required")
    }

    return division as Division
  }

  private assertCanView(purchase: Purchase, user: AuthenticatedUser) {
    if (user.role === UserRole.Admin) {
      return
    }

    if (purchase.division !== this.getManagerDivision(user)) {
      throw new ForbiddenException("purchase is outside your managed division")
    }
  }

  private assertCanUpdatePurchase(
    purchase: Purchase,
    input: Partial<PurchaseInput>,
    user: AuthenticatedUser
  ) {
    this.assertCanView(purchase, user)

    if (
      purchase.status === PurchaseStatus.Received ||
      purchase.status === PurchaseStatus.Cancelled
    ) {
      throw new ForbiddenException(
        `Cannot edit a ${purchase.status.toLowerCase()} purchase`
      )
    }

    if (user.role === UserRole.Admin) {
      this.assertCoreFieldsUnchangedForInventoryPurchase(purchase, input)
      return
    }

    if (purchase.requestedById !== user.id) {
      throw new ForbiddenException("you can only edit your own purchase request")
    }

    if (purchase.status !== PurchaseStatus.Pending) {
      throw new ForbiddenException(
        "Managers can only edit pending purchase requests"
      )
    }

    const allowedFields = ["quantity", "reason", "priority"]
    const forbiddenFields = Object.keys(input).filter(
      (field) => !allowedFields.includes(field)
    )

    if (forbiddenFields.length > 0) {
      throw new ForbiddenException(
        `Managers cannot update: ${forbiddenFields.join(", ")}`
      )
    }

    this.assertCoreFieldsUnchangedForInventoryPurchase(purchase, input)
  }

  private assertCoreFieldsUnchangedForInventoryPurchase(
    purchase: Purchase,
    input: Partial<PurchaseInput>
  ) {
    if (
      input.sourcePartId !== undefined &&
      input.sourcePartId !== purchase.sourcePartId
    ) {
      throw new ForbiddenException("Purchase source cannot be changed")
    }
    if (
      input.sourceMissingItemRequestId !== undefined &&
      input.sourceMissingItemRequestId !== purchase.sourceMissingItemRequestId
    ) {
      throw new ForbiddenException("Purchase source cannot be changed")
    }

    if (!purchase.sourcePartId) {
      return
    }

    const coreFields: Array<keyof PurchaseInput> = [
      "itemName",
      "category",
      "manufacturer",
      "reference",
    ]
    if (
      coreFields.some(
        (field) =>
          input[field] !== undefined && input[field] !== purchase[field]
      )
    ) {
      throw new ForbiddenException(
        "Inventory-linked purchase identity fields are locked"
      )
    }
  }

  private async applyAdminWorkflowUpdate(
    purchase: Purchase,
    input: Partial<PurchaseInput>,
    coreFieldsLocked = false
  ) {
    const safeInput = coreFieldsLocked
      ? {
          supplierName: input.supplierName,
          supplierContact: input.supplierContact,
          unitPrice: input.unitPrice,
          totalPrice: input.totalPrice,
          expectedArrivalDate: input.expectedArrivalDate,
          adminComment: input.adminComment,
        }
      : this.getDefinedPurchaseInput(input)
    const definedInput = this.getDefinedPurchaseInput(safeInput)
    Object.assign(purchase, definedInput)
    this.validateInput(purchase)
    return this.purchasesRepository.save(purchase)
  }

  private getDefinedPurchaseInput(input: Partial<PurchaseInput>) {
    const allowedFields: Array<keyof PurchaseInput> = [
      "sourcePartId",
      "sourceMissingItemRequestId",
      "itemName",
      "category",
      "manufacturer",
      "reference",
      "quantity",
      "reason",
      "priority",
      "division",
      "supplierName",
      "supplierContact",
      "unitPrice",
      "totalPrice",
      "expectedArrivalDate",
      "adminComment",
    ]

    return Object.fromEntries(
      allowedFields
        .filter((field) => input[field] !== undefined)
        .map((field) => [field, input[field]])
    ) as Partial<PurchaseInput>
  }

  private assertStatus(
    purchase: Purchase,
    expectedStatus: PurchaseStatus,
    action: string
  ) {
    if (purchase.status !== expectedStatus) {
      throw new BadRequestException(
        `Cannot ${action} a purchase with status ${purchase.status}`
      )
    }
  }

  private mergeReason(existingReason: string, newReason: string) {
    if (!newReason || existingReason.includes(newReason)) {
      return existingReason
    }

    return `${existingReason}\n${newReason}`
  }

  private syncLegacyPartFields(part: Part) {
    part.quantity = part.availableQuantity
    part.status = part.availableQuantity > 0 ? "Available" : "Not Available"
  }

  private notifyPurchaseCreated(purchase: Purchase, user: AuthenticatedUser) {
    return this.notificationsService.notifyAdmins(
      {
        title: "New purchase request",
        message: `New purchase request from ${user.name || user.email}`,
        type: NotificationType.PurchaseRequestCreated,
        targetPage: "Purchase",
        targetSection: "PurchaseRequests",
        targetId: purchase.id,
        isActionable: true,
      },
      user.id
    )
  }

  private notifyRequester(purchase: Purchase, type: NotificationType) {
    return this.notificationsService.notifyUser(purchase.requestedById, {
      title: `Purchase request ${purchase.status.toLowerCase()}`,
      message: `${purchase.itemName} is now ${purchase.status.toLowerCase()}.`,
      type,
      targetPage: "Purchase",
      targetSection: "PurchaseRequests",
      targetId: purchase.id,
    })
  }
}
