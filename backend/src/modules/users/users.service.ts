import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import * as bcrypt from "bcryptjs"
import { Repository } from "typeorm"
import {
  CollaboratorGroup,
  Division,
} from "../collaborators/collaborator.entity"
import { User, UserRole } from "./user.entity"

type CreateUserInput = {
  name: string
  email: string
  password: string
  role: UserRole
  division: Division
  group: CollaboratorGroup
  managedDivision?: Division | null
}

type UpdateUserAssignmentInput = {
  role: UserRole
  managedDivision?: Division | null
}

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  async onModuleInit() {
    const count = await this.usersRepository.count()

    if (count > 0) {
      await this.ensureManagedDivisionDefaults()
      return
    }

    await this.create({
      name: "Admin User",
      email: "admin@stockdashboard.local",
      password: "admin123",
      role: UserRole.Admin,
      division: Division.Admin,
      group: CollaboratorGroup.Group1,
      managedDivision: null,
    })
    await this.create({
      name: "Inventory Manager",
      email: "manager@stockdashboard.local",
      password: "manager123",
      role: UserRole.InventoryManager,
      division: Division.Division1,
      group: CollaboratorGroup.Group1,
      managedDivision: Division.Division1,
    })
    await this.create({
      name: "Local Collaborator",
      email: "collaborator@stockdashboard.local",
      password: "user123",
      role: UserRole.Collaborator,
      division: Division.Division2,
      group: CollaboratorGroup.Group2,
      managedDivision: null,
    })
  }

  findAll() {
    return this.usersRepository.find({ order: { id: "ASC" } })
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    })
  }

  async findById(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    return user
  }

  async create(input: CreateUserInput) {
    this.validate(input)

    const email = input.email.toLowerCase().trim()
    const existingUser = await this.findByEmail(email)

    if (existingUser) {
      throw new BadRequestException("Email is already registered")
    }

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = this.usersRepository.create({
      name: input.name.trim(),
      email,
      passwordHash,
      role: input.role,
      division: input.division,
      group: input.group,
      managedDivision: input.managedDivision || null,
    })

    return this.usersRepository.save(user)
  }

  async updateAssignment(id: number, input: UpdateUserAssignmentInput) {
    const user = await this.findById(id)

    if (!Object.values(UserRole).includes(input.role)) {
      throw new BadRequestException("Role is invalid")
    }

    if (
      input.managedDivision &&
      !Object.values(Division).includes(input.managedDivision)
    ) {
      throw new BadRequestException("Managed division is invalid")
    }

    if (
      input.role === UserRole.InventoryManager &&
      (!input.managedDivision || input.managedDivision === Division.Admin)
    ) {
      throw new BadRequestException("Inventory Manager requires a division")
    }

    user.role = input.role
    user.managedDivision =
      input.role === UserRole.InventoryManager ? input.managedDivision || null : null

    return this.usersRepository.save(user)
  }

  toPublicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      division: user.division,
      group: user.group,
      managedDivision: user.managedDivision,
    }
  }

  private async ensureManagedDivisionDefaults() {
    const managers = await this.usersRepository.find({
      where: { role: UserRole.InventoryManager },
    })

    await Promise.all(
      managers
        .filter((manager) => !manager.managedDivision)
        .map((manager) =>
          this.usersRepository.save({
            ...manager,
            managedDivision:
              manager.division === Division.Admin ? Division.Division1 : manager.division,
          })
        )
    )
  }

  private validate(input: CreateUserInput) {
    if (!input.name?.trim()) {
      throw new BadRequestException("Name is required")
    }

    if (!input.email?.trim()) {
      throw new BadRequestException("Email is required")
    }

    if (!input.password || input.password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters")
    }

    if (!Object.values(UserRole).includes(input.role)) {
      throw new BadRequestException("Role is invalid")
    }

    if (!Object.values(Division).includes(input.division)) {
      throw new BadRequestException("Division is invalid")
    }

    if (!Object.values(CollaboratorGroup).includes(input.group)) {
      throw new BadRequestException("Group is invalid")
    }
  }
}
