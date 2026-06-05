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
import { RequestStatus } from "../requests/part-request.entity"
import { UserRole } from "../users/user.entity"
import { MissingItemRequest } from "./missing-item-request.entity"

type CreateMissingItemRequestInput = {
  partId?: number
  itemName: string
  category: string
  manufacturer?: string
  reference?: string
  quantityNeeded: number
  reason: string
  neededDate: string
}

@Injectable()
export class MissingItemRequestsService {
  constructor(
    @InjectRepository(MissingItemRequest)
    private readonly missingItemRequestsRepository: Repository<MissingItemRequest>,
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>
  ) {}

  async findAll(user: AuthenticatedUser) {
    const requests = await this.missingItemRequestsRepository.find({
      relations: { collaborator: true },
      order: { id: "DESC" },
    })

    if (user.role === UserRole.Admin) {
      return requests
    }

    return requests.filter((request) => this.isInManagedDivision(request, user))
  }

  async findMyRequests(user: AuthenticatedUser) {
    const collaborator = await this.findOrCreateCollaboratorForUser(user)

    return this.missingItemRequestsRepository.find({
      where: { collaboratorId: collaborator.id },
      relations: { collaborator: true },
      order: { id: "DESC" },
    })
  }

  async create(input: CreateMissingItemRequestInput, user: AuthenticatedUser) {
    this.validateCreateInput(input)
    const collaborator = await this.findOrCreateCollaboratorForUser(user)
    const request = this.missingItemRequestsRepository.create({
      collaboratorId: collaborator.id,
      partId: input.partId || null,
      itemName: input.itemName.trim(),
      category: input.category,
      manufacturer: input.manufacturer?.trim() || "",
      reference: input.reference?.trim() || "",
      quantityNeeded: input.quantityNeeded,
      reason: input.reason.trim(),
      neededDate: input.neededDate,
      status: RequestStatus.Pending,
      managerComment: "",
    })

    return this.missingItemRequestsRepository.save(request)
  }

  async approve(id: number, managerComment = "", user: AuthenticatedUser) {
    const request = await this.findOne(id)
    this.assertCanManageRequest(request, user)

    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException("only pending requests can be approved")
    }

    request.status = RequestStatus.Approved
    request.managerComment = managerComment

    return this.missingItemRequestsRepository.save(request)
  }

  async reject(id: number, managerComment = "", user: AuthenticatedUser) {
    const request = await this.findOne(id)
    this.assertCanManageRequest(request, user)

    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException("only pending requests can be rejected")
    }

    request.status = RequestStatus.Rejected
    request.managerComment = managerComment

    return this.missingItemRequestsRepository.save(request)
  }

  private async findOne(id: number) {
    const request = await this.missingItemRequestsRepository.findOne({
      where: { id },
      relations: { collaborator: true },
    })

    if (!request) {
      throw new NotFoundException(`Missing item request with id ${id} not found`)
    }

    return request
  }

  private assertCanManageRequest(
    request: MissingItemRequest,
    user: AuthenticatedUser
  ) {
    if (user.role === UserRole.Admin) {
      return
    }

    if (!this.isInManagedDivision(request, user)) {
      throw new ForbiddenException("request is outside your managed division")
    }
  }

  private isInManagedDivision(
    request: MissingItemRequest,
    user: AuthenticatedUser
  ) {
    const managedDivision = user.managedDivision || user.division

    return Boolean(
      managedDivision && request.collaborator?.division === managedDivision
    )
  }

  private validateCreateInput(input: CreateMissingItemRequestInput) {
    if (!input.itemName?.trim()) {
      throw new BadRequestException("itemName is required")
    }

    if (!input.category?.trim()) {
      throw new BadRequestException("category is required")
    }

    if (!Number.isInteger(input.quantityNeeded) || input.quantityNeeded <= 0) {
      throw new BadRequestException("quantityNeeded must be greater than 0")
    }

    if (!input.reason?.trim()) {
      throw new BadRequestException("reason is required")
    }

    if (!input.neededDate) {
      throw new BadRequestException("neededDate is required")
    }

    if (this.isPastDate(input.neededDate)) {
      throw new BadRequestException("Date cannot be in the past")
    }
  }

  private isPastDate(value?: string) {
    if (!value) {
      return false
    }

    return value < new Date().toISOString().slice(0, 10)
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
      role: user.role || UserRole.Collaborator,
    })

    return this.collaboratorsRepository.save(collaborator)
  }
}
