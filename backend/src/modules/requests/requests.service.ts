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

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(PartRequest)
    private readonly requestsRepository: Repository<PartRequest>,
    @InjectRepository(Part)
    private readonly partsRepository: Repository<Part>,
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>
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

    if (input.quantity > part.quantity) {
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

    if (request.quantity > part.quantity) {
      throw new BadRequestException("cannot approve more than available quantity")
    }

    part.quantity -= request.quantity
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

    if (request.status === RequestStatus.Returned) {
      throw new BadRequestException("request has already been returned")
    }

    if (
      request.status !== RequestStatus.Reserved &&
      request.status !== RequestStatus.Borrowed
    ) {
      throw new BadRequestException("only reserved or borrowed requests can be returned")
    }

    const part = await this.findPart(request.partId)
    part.quantity += request.quantity
    await this.partsRepository.save(part)

    request.status = RequestStatus.Returned
    request.managerComment = managerComment || request.managerComment

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
    }
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
}
