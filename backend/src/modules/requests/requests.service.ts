import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { AuthenticatedUser } from "../../common/authenticated-request"
import {
  Collaborator,
  CollaboratorGroup,
  Division,
} from "../collaborators/collaborator.entity"
import { RatingHistory } from "../collaborators/rating-history.entity"
import { Part } from "../parts/part.entity"
import { UserRole } from "../users/user.entity"
import { PartRequest, RequestStatus, RequestType } from "./part-request.entity"

type CreateRequestInput = {
  collaboratorId?: number
  partId: number
  quantity: number
  requestType: RequestType
  reason: string
  expectedReturnDate?: string
  usageDate?: string
  startDate?: string
  dueDate?: string
}

type DeclareReturnInput = {
  goodQuantity: number
  damagedQuantity: number
  comment?: string
}

type ConfirmReturnInput = {
  confirmedGoodQuantity: number
  confirmedDamagedQuantity: number
  managerComment?: string
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(PartRequest)
    private readonly requestsRepository: Repository<PartRequest>,
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>,
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>,
    @InjectRepository(RatingHistory)
    private readonly ratingHistoryRepository: Repository<RatingHistory>
  ) {}

  async findAll(user: AuthenticatedUser) {
    const requests = await this.requestsRepository.find({
      relations: { collaborator: true, part: true },
      order: { id: "DESC" },
    })

    if (user.role === UserRole.Admin) {
      return requests
    }

    return requests.filter((request) => this.isInManagedDivision(request, user))
  }

  async findMyRequests(user: AuthenticatedUser) {
    const collaborator = await this.findOrCreateCollaboratorForUser(user)

    return this.requestsRepository.find({
      where: { collaboratorId: collaborator.id },
      relations: { collaborator: true, part: true },
      order: { id: "DESC" },
    })
  }

  async create(input: CreateRequestInput, user: AuthenticatedUser) {
    this.validateCreateInput(input)

    const collaborator = await this.resolveCollaborator(input, user)
    const part = await this.findPart(input.partId)

    if (input.quantity > part.availableQuantity) {
      throw new BadRequestException("cannot request more than available quantity")
    }

    const request = this.requestsRepository.create({
      collaboratorId: collaborator.id,
      partId: part.id,
      quantity: input.quantity,
      requestType: input.requestType,
      reason: input.reason.trim(),
      expectedReturnDate: this.getExpectedReturnDate(input),
      usageDate: input.requestType === RequestType.Reservation ? input.usageDate : null,
      startDate: input.requestType === RequestType.Borrow ? input.startDate : null,
      dueDate: input.requestType === RequestType.Borrow ? input.dueDate : null,
      status: RequestStatus.Pending,
      managerComment: "",
    })

    return this.requestsRepository.save(request)
  }

  async approve(id: number, managerComment = "", user: AuthenticatedUser) {
    const request = await this.findOne(id)
    this.assertCanManageRequest(request, user)

    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException("only pending requests can be approved")
    }

    const part = await this.findPart(request.partId)

    if (request.quantity > part.availableQuantity) {
      throw new BadRequestException("cannot approve more than available quantity")
    }

    part.availableQuantity -= request.quantity
    if (request.requestType === RequestType.Reservation) {
      part.reservedQuantity += request.quantity
    } else {
      part.borrowedQuantity += request.quantity
    }
    this.syncLegacyPartFields(part)
    await this.partsRepository.save(part)

    request.status =
      request.requestType === RequestType.Reservation
        ? RequestStatus.Reserved
        : RequestStatus.Borrowed
    request.managerComment = managerComment

    return this.requestsRepository.save(request)
  }

  async reject(id: number, managerComment = "", user: AuthenticatedUser) {
    const request = await this.findOne(id)
    this.assertCanManageRequest(request, user)

    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException("only pending requests can be rejected")
    }

    request.status = RequestStatus.Rejected
    request.managerComment = managerComment

    return this.requestsRepository.save(request)
  }

  async returnRequest(id: number, managerComment = "", user: AuthenticatedUser) {
    const request = await this.findOne(id)
    this.assertCanManageRequest(request, user)

    if (
      request.status === RequestStatus.Returned ||
      request.status === RequestStatus.Damaged
    ) {
      throw new BadRequestException("request has already been returned")
    }

    if (
      request.status !== RequestStatus.Reserved &&
      request.status !== RequestStatus.Borrowed
    ) {
      throw new BadRequestException("only reserved or borrowed requests can be returned")
    }

    const part = await this.findPart(request.partId)
    if (request.status === RequestStatus.Reserved) {
      part.reservedQuantity = Math.max(0, part.reservedQuantity - request.quantity)
    } else {
      part.borrowedQuantity = Math.max(0, part.borrowedQuantity - request.quantity)
    }
    part.availableQuantity += request.quantity
    this.syncLegacyPartFields(part)
    await this.partsRepository.save(part)

    request.status = RequestStatus.Returned
    request.managerComment = managerComment || request.managerComment

    await this.applyReturnRatingRule(request, user)

    return this.requestsRepository.save(request)
  }

  async declareReturn(
    id: number,
    input: DeclareReturnInput,
    user: AuthenticatedUser
  ) {
    const request = await this.findOne(id)

    if (user.role === UserRole.Collaborator) {
      const collaborator = await this.findOrCreateCollaboratorForUser(user)
      if (request.collaboratorId !== collaborator.id) {
        throw new ForbiddenException("you can only declare your own returns")
      }
    }

    if (
      request.status !== RequestStatus.Reserved &&
      request.status !== RequestStatus.Borrowed
    ) {
      throw new BadRequestException("only active requests can be declared returned")
    }

    this.validateReturnQuantities(
      input.goodQuantity,
      input.damagedQuantity,
      request.quantity,
      input.comment
    )

    request.status = RequestStatus.ReturnPending
    request.returnDeclaredAt = new Date()
    request.returnGoodQuantity = input.goodQuantity
    request.returnDamagedQuantity = input.damagedQuantity
    request.returnComment = input.comment?.trim() || ""

    return this.requestsRepository.save(request)
  }

  async confirmReturn(
    id: number,
    input: ConfirmReturnInput,
    user: AuthenticatedUser
  ) {
    const request = await this.findOne(id)
    this.assertCanManageRequest(request, user)

    if (request.status !== RequestStatus.ReturnPending) {
      throw new BadRequestException("only return pending requests can be confirmed")
    }

    this.validateReturnQuantities(
      input.confirmedGoodQuantity,
      input.confirmedDamagedQuantity,
      request.quantity,
      input.managerComment
    )

    const part = await this.findPart(request.partId)
    if (request.requestType === RequestType.Reservation) {
      part.reservedQuantity = Math.max(0, part.reservedQuantity - request.quantity)
    } else {
      part.borrowedQuantity = Math.max(0, part.borrowedQuantity - request.quantity)
    }
    part.availableQuantity += input.confirmedGoodQuantity
    part.damagedQuantity += input.confirmedDamagedQuantity
    this.syncLegacyPartFields(part)
    await this.partsRepository.save(part)

    request.returnConfirmedAt = new Date()
    request.confirmedGoodQuantity = input.confirmedGoodQuantity
    request.confirmedDamagedQuantity = input.confirmedDamagedQuantity
    request.returnManagerComment = input.managerComment?.trim() || ""
    request.managerComment =
      request.returnManagerComment || request.managerComment || ""
    request.status =
      input.confirmedDamagedQuantity > 0
        ? RequestStatus.Damaged
        : RequestStatus.Returned

    await this.applyReturnRatingRule(request, user)
    if (input.confirmedDamagedQuantity > 0) {
      await this.adjustCollaboratorRating(
        request.collaborator,
        -2,
        `Returned ${input.confirmedDamagedQuantity} damaged item${
          input.confirmedDamagedQuantity === 1 ? "" : "s"
        }`,
        user.email
      )
    }

    return this.requestsRepository.save(request)
  }

  async markDamaged(id: number, managerComment = "", user: AuthenticatedUser) {
    const request = await this.findOne(id)
    this.assertCanManageRequest(request, user)

    if (
      request.status !== RequestStatus.Reserved &&
      request.status !== RequestStatus.Borrowed
    ) {
      throw new BadRequestException("only active requests can be marked damaged")
    }

    request.managerComment =
      managerComment || "Item marked damaged or lost by manager"

    const part = await this.findPart(request.partId)
    if (request.status === RequestStatus.Reserved) {
      part.reservedQuantity = Math.max(0, part.reservedQuantity - request.quantity)
    } else {
      part.borrowedQuantity = Math.max(0, part.borrowedQuantity - request.quantity)
    }
    part.damagedQuantity += request.quantity
    this.syncLegacyPartFields(part)
    await this.partsRepository.save(part)

    await this.adjustCollaboratorRating(
      request.collaborator,
      -2,
      request.managerComment,
      user.email
    )

    request.status = RequestStatus.Returned

    return this.requestsRepository.save(request)
  }

  private async findOne(id: number) {
    const request = await this.requestsRepository.findOne({
      where: { id },
      relations: { collaborator: true, part: true },
    })

    if (!request) {
      throw new NotFoundException(`Request with id ${id} not found`)
    }

    return request
  }

  private assertCanManageRequest(request: PartRequest, user: AuthenticatedUser) {
    if (user.role === UserRole.Admin) {
      return
    }

    if (!this.isInManagedDivision(request, user)) {
      throw new ForbiddenException("request is outside your managed division")
    }
  }

  private isInManagedDivision(request: PartRequest, user: AuthenticatedUser) {
    const managedDivision = user.managedDivision || user.division

    return Boolean(
      managedDivision && request.collaborator?.division === managedDivision
    )
  }

  private validateCreateInput(input: CreateRequestInput) {
    if (!Number.isInteger(input.partId)) {
      throw new BadRequestException("partId is required")
    }

    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new BadRequestException("quantity must be greater than 0")
    }

    if (!Object.values(RequestType).includes(input.requestType)) {
      throw new BadRequestException("requestType is invalid")
    }

    if (!input.reason?.trim()) {
      throw new BadRequestException("reason is required")
    }

    if (input.requestType === RequestType.Reservation && !input.usageDate) {
      throw new BadRequestException("usageDate is required for reservations")
    }

    if (input.requestType === RequestType.Reservation && this.isPastDate(input.usageDate)) {
      throw new BadRequestException("Date cannot be in the past")
    }

    if (input.requestType === RequestType.Borrow) {
      if (!input.startDate) {
        throw new BadRequestException("startDate is required for borrowing")
      }

      if (!input.dueDate) {
        throw new BadRequestException("dueDate is required for borrowing")
      }

      if (input.dueDate < input.startDate) {
        throw new BadRequestException("dueDate must be after or equal startDate")
      }

      if (this.isPastDate(input.startDate) || this.isPastDate(input.dueDate)) {
        throw new BadRequestException("Date cannot be in the past")
      }
    }
  }

  private validateReturnQuantities(
    goodQuantity: number,
    damagedQuantity: number,
    totalQuantity: number,
    comment?: string
  ) {
    if (
      !Number.isInteger(Number(goodQuantity)) ||
      !Number.isInteger(Number(damagedQuantity)) ||
      goodQuantity < 0 ||
      damagedQuantity < 0
    ) {
      throw new BadRequestException("return quantities must be zero or greater")
    }

    if (goodQuantity + damagedQuantity !== totalQuantity) {
      throw new BadRequestException(
        "good and damaged quantities must equal original quantity"
      )
    }

    if (damagedQuantity > 0 && !comment?.trim()) {
      throw new BadRequestException("comment is required for damaged returns")
    }
  }

  private isPastDate(value?: string) {
    if (!value) {
      return false
    }

    return value < new Date().toISOString().slice(0, 10)
  }

  private getExpectedReturnDate(input: CreateRequestInput) {
    if (input.requestType === RequestType.Reservation) {
      return input.usageDate
    }

    return input.dueDate
  }

  private async resolveCollaborator(
    input: CreateRequestInput,
    user: AuthenticatedUser
  ) {
    if (user.role === UserRole.Collaborator) {
      return this.findOrCreateCollaboratorForUser(user)
    }

    if (Number.isInteger(input.collaboratorId)) {
      const collaborator = await this.collaboratorsRepository.findOne({
        where: { id: input.collaboratorId },
      })

      if (!collaborator) {
        throw new NotFoundException("collaborator not found")
      }

      return collaborator
    }

    return this.findOrCreateCollaboratorForUser(user)
  }

  private async findOrCreateCollaboratorForUser(user: AuthenticatedUser) {
    const existingCollaborator = await this.collaboratorsRepository.findOne({
      where: { email: user.email },
    })

    if (existingCollaborator) {
      return existingCollaborator
    }

    const collaborator = this.collaboratorsRepository.create({
      name: user.name || user.email,
      email: user.email,
      division: (user.division as Division) || Division.Division1,
      group: (user.group as CollaboratorGroup) || CollaboratorGroup.Group1,
      role: user.role,
    })

    return this.collaboratorsRepository.save(collaborator)
  }

  private async findPart(id: number) {
    const part = await this.partsRepository.findOne({ where: { id } })

    if (!part) {
      throw new NotFoundException(`Part with id ${id} not found`)
    }

    return part
  }

  private syncLegacyPartFields(part: Part) {
    part.quantity = part.availableQuantity
    part.status = part.availableQuantity > 0 ? "Available" : "Not Available"
  }

  private async applyReturnRatingRule(
    request: PartRequest,
    user: AuthenticatedUser
  ) {
    if (request.requestType !== RequestType.Borrow || !request.dueDate) {
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dueDate = new Date(`${request.dueDate}T00:00:00`)
    const lateDays = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (lateDays <= 0) {
      return
    }

    const penalty = lateDays <= 3 ? -0.5 : lateDays <= 7 ? -1 : -2
    await this.adjustCollaboratorRating(
      request.collaborator,
      penalty,
      `Late return by ${lateDays} day${lateDays === 1 ? "" : "s"}`,
      user.email
    )
  }

  private async adjustCollaboratorRating(
    collaborator: Collaborator | undefined,
    delta: number,
    reason: string,
    changedBy: string
  ) {
    if (!collaborator) {
      return
    }

    const previousRating = collaborator.rating || 5
    const nextRating = Math.max(1, Math.min(5, previousRating + delta))

    if (nextRating === previousRating) {
      return
    }

    collaborator.rating = nextRating
    await this.collaboratorsRepository.save(collaborator)
    await this.ratingHistoryRepository.save({
      collaboratorId: collaborator.id,
      previousRating,
      newRating: nextRating,
      reason,
      changedBy,
    })
  }
}
