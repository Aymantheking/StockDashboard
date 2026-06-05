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
import { UserRole } from "../users/user.entity"
import { Purchase, PurchasePriority, PurchaseStatus } from "./purchase.entity"

type PurchaseInput = {
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
    private readonly partsRepository: Repository<Part>
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

    const purchase = this.purchasesRepository.create({
      itemName: input.itemName.trim(),
      category: input.category.trim(),
      manufacturer: input.manufacturer?.trim() || "",
      reference: input.reference?.trim() || "",
      quantity: input.quantity,
      reason: input.reason.trim(),
      priority: input.priority,
      requestedById: user.id,
      division:
        user.role === UserRole.Admin
          ? input.division || Division.Admin
          : this.getManagerDivision(user),
      supplierName: input.supplierName?.trim() || "",
      supplierContact: input.supplierContact?.trim() || "",
      unitPrice: Number(input.unitPrice || 0),
      totalPrice: Number(input.totalPrice || 0),
      expectedArrivalDate: input.expectedArrivalDate || null,
      adminComment: input.adminComment?.trim() || "",
      status: PurchaseStatus.Pending,
      receivedDate: null,
    })

    return this.purchasesRepository.save(purchase)
  }

  async update(id: number, input: Partial<PurchaseInput>, user: AuthenticatedUser) {
    const purchase = await this.findOne(id, user)
    this.assertCanManagePurchase(purchase, user)

    const updatedPurchase = {
      ...purchase,
      ...input,
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
    const purchase = await this.update(id, input, user)
    purchase.status = PurchaseStatus.Ordered
    return this.purchasesRepository.save(purchase)
  }

  async approve(id: number, input: Partial<PurchaseInput>, user: AuthenticatedUser) {
    const purchase = await this.update(id, input, user)
    purchase.status = PurchaseStatus.Approved
    return this.purchasesRepository.save(purchase)
  }

  async markInTransit(
    id: number,
    input: Partial<PurchaseInput>,
    user: AuthenticatedUser
  ) {
    const purchase = await this.update(id, input, user)
    purchase.status = PurchaseStatus.InTransit
    return this.purchasesRepository.save(purchase)
  }

  async receive(id: number, input: Partial<PurchaseInput>, user: AuthenticatedUser) {
    const purchase = await this.update(id, input, user)

    if (purchase.status === PurchaseStatus.Received) {
      throw new BadRequestException("purchase has already been received")
    }

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
          reference: purchase.reference || `PUR-${purchase.id}`,
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
    return this.purchasesRepository.save(purchase)
  }

  async cancel(id: number, input: { adminComment?: string }, user: AuthenticatedUser) {
    const purchase = await this.findOne(id, user)
    this.assertCanManagePurchase(purchase, user)

    purchase.status = PurchaseStatus.Cancelled
    purchase.adminComment = input.adminComment || purchase.adminComment
    return this.purchasesRepository.save(purchase)
  }

  async remove(id: number) {
    const purchase = await this.purchasesRepository.findOne({ where: { id } })

    if (!purchase) {
      throw new NotFoundException(`Purchase with id ${id} not found`)
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

  private assertCanManagePurchase(purchase: Purchase, user: AuthenticatedUser) {
    this.assertCanView(purchase, user)
  }

  private syncLegacyPartFields(part: Part) {
    part.quantity = part.availableQuantity
    part.status = part.availableQuantity > 0 ? "Available" : "Not Available"
  }
}
