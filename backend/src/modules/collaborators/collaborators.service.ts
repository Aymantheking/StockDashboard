import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { AuthenticatedUser } from "../../common/authenticated-request"
import { UserRole } from "../users/user.entity"
import {
  Collaborator,
  CollaboratorGroup,
  Division,
} from "./collaborator.entity"
import { RatingHistory } from "./rating-history.entity"

type CollaboratorInput = Omit<
  Collaborator,
  "id" | "createdAt" | "updatedAt" | "reservations"
>

@Injectable()
export class CollaboratorsService implements OnModuleInit {
  constructor(
    @InjectRepository(Collaborator)
    private readonly collaboratorsRepository: Repository<Collaborator>,
    @InjectRepository(RatingHistory)
    private readonly ratingHistoryRepository: Repository<RatingHistory>
  ) {}

  async onModuleInit() {
    const count = await this.collaboratorsRepository.count()

    if (count > 0) {
      return
    }

    await this.collaboratorsRepository.save([
      this.collaboratorsRepository.create({
        name: "Ayman Douah",
        email: "ayman.douah@bertrandt.com",
        division: Division.Admin,
        group: CollaboratorGroup.Group1,
        role: "Inventory Manager",
      }),
      this.collaboratorsRepository.create({
        name: "Ahmed B.",
        email: "ahmed.b@bertrandt.com",
        division: Division.Division1,
        group: CollaboratorGroup.Group2,
        role: "Embedded Engineer",
      }),
      this.collaboratorsRepository.create({
        name: "Sara M.",
        email: "sara.m@bertrandt.com",
        division: Division.Division2,
        group: CollaboratorGroup.Group3,
        role: "Validation Engineer",
      }),
      this.collaboratorsRepository.create({
        name: "Youssef A.",
        email: "youssef.a@bertrandt.com",
        division: Division.Division3,
        group: CollaboratorGroup.Group4,
        role: "Hardware Technician",
      }),
    ])
  }

  findAll() {
    return this.collaboratorsRepository.find({ order: { id: "ASC" } })
  }

  async findAllForUser(user: AuthenticatedUser) {
    if (user.role === UserRole.InventoryManager) {
      return this.collaboratorsRepository.find({
        where: {
          division: (user.managedDivision || user.division) as Division,
        },
        order: { id: "ASC" },
      })
    }

    return this.findAll()
  }

  async findOne(id: number) {
    const collaborator = await this.collaboratorsRepository.findOne({
      where: { id },
    })

    if (!collaborator) {
      throw new NotFoundException(`Collaborator with id ${id} not found`)
    }

    return collaborator
  }

  async create(input: CollaboratorInput) {
    this.validateCollaboratorInput(input)

    const collaborator = this.collaboratorsRepository.create(input)
    return this.collaboratorsRepository.save(collaborator)
  }

  async update(id: number, input: Partial<CollaboratorInput>) {
    const collaborator = await this.findOne(id)
    const updatedCollaborator = { ...collaborator, ...input }

    this.validateCollaboratorInput(updatedCollaborator)

    return this.collaboratorsRepository.save(updatedCollaborator)
  }

  async remove(id: number) {
    const collaborator = await this.findOne(id)
    await this.collaboratorsRepository.remove(collaborator)
    return { deleted: true }
  }

  getRatingHistory(collaboratorId: number) {
    return this.ratingHistoryRepository.find({
      where: { collaboratorId },
      order: { createdAt: "DESC" },
    })
  }

  async adjustRating(
    collaboratorId: number,
    newRating: number,
    reason: string,
    changedBy: string
  ) {
    if (newRating < 1 || newRating > 5) {
      throw new BadRequestException("rating must be between 1 and 5")
    }

    const collaborator = await this.findOne(collaboratorId)
    const previousRating = collaborator.rating || 5
    collaborator.rating = Math.max(1, Math.min(5, newRating))
    await this.collaboratorsRepository.save(collaborator)

    await this.ratingHistoryRepository.save({
      collaboratorId,
      previousRating,
      newRating: collaborator.rating,
      reason,
      changedBy,
    })

    return collaborator
  }

  private validateCollaboratorInput(input: Partial<CollaboratorInput>) {
    if (!input.name || typeof input.name !== "string") {
      throw new BadRequestException("name is required")
    }

    if (!input.email || typeof input.email !== "string") {
      throw new BadRequestException("email is required")
    }

    if (!Object.values(Division).includes(input.division as Division)) {
      throw new BadRequestException("division is invalid")
    }

    if (
      !Object.values(CollaboratorGroup).includes(
        input.group as CollaboratorGroup
      )
    ) {
      throw new BadRequestException("group is invalid")
    }

    if (!input.role || typeof input.role !== "string") {
      throw new BadRequestException("role is required")
    }
  }
}
