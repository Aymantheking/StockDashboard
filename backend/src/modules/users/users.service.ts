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
import { EmailVerificationStatus, User, UserRole } from "./user.entity"

type CreateUserInput = {
  name: string
  email: string
  password: string
  role: UserRole
  division: Division
  group: CollaboratorGroup
  managedDivision?: Division | null
  emailVerificationStatus?: EmailVerificationStatus
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
    await this.ensureDefaultUsers()
    await this.ensureManagedDivisionDefaults()
    await this.ensureTestUsers()
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
      emailVerificationStatus:
        input.emailVerificationStatus || EmailVerificationStatus.Verified,
    })

    return this.usersRepository.save(user)
  }

  async updateVerificationStatus(
    id: number,
    emailVerificationStatus: EmailVerificationStatus
  ) {
    if (!Object.values(EmailVerificationStatus).includes(emailVerificationStatus)) {
      throw new BadRequestException("Email verification status is invalid")
    }

    const user = await this.findById(id)
    user.emailVerificationStatus = emailVerificationStatus

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
      emailVerificationStatus: user.emailVerificationStatus,
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

  private async ensureDefaultUsers() {
    await this.createSeedUser({
      name: "Admin User",
      email: "admin@stockdashboard.local",
      password: "admin123",
      role: UserRole.Admin,
      division: Division.Admin,
      group: CollaboratorGroup.Group1,
      managedDivision: null,
      emailVerificationStatus: EmailVerificationStatus.Verified,
    })
    await this.createSeedUser({
      name: "Inventory Manager",
      email: "manager@stockdashboard.local",
      password: "manager123",
      role: UserRole.InventoryManager,
      division: Division.Division1,
      group: CollaboratorGroup.Group1,
      managedDivision: Division.Division1,
      emailVerificationStatus: EmailVerificationStatus.Verified,
    })
    await this.createSeedUser({
      name: "Local Collaborator",
      email: "collaborator@stockdashboard.local",
      password: "user123",
      role: UserRole.Collaborator,
      division: Division.Division2,
      group: CollaboratorGroup.Group2,
      managedDivision: null,
      emailVerificationStatus: EmailVerificationStatus.Verified,
    })
  }

  private async ensureTestUsers() {
    const password = "Password123!"
    const users: CreateUserInput[] = [
      {
        name: "Admin One",
        email: "admin1@bertrandt.com",
        password,
        role: UserRole.Admin,
        division: Division.Admin,
        group: CollaboratorGroup.Group1,
        managedDivision: null,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
      {
        name: "Manager Division 1",
        email: "manager.div1@bertrandt.com",
        password,
        role: UserRole.InventoryManager,
        division: Division.Division1,
        group: CollaboratorGroup.Group1,
        managedDivision: Division.Division1,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
      {
        name: "Manager Division 2",
        email: "manager.div2@bertrandt.com",
        password,
        role: UserRole.InventoryManager,
        division: Division.Division2,
        group: CollaboratorGroup.Group2,
        managedDivision: Division.Division2,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
      {
        name: "Manager Division 3",
        email: "manager.div3@bertrandt.com",
        password,
        role: UserRole.InventoryManager,
        division: Division.Division3,
        group: CollaboratorGroup.Group3,
        managedDivision: Division.Division3,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
      {
        name: "Manager Division 4",
        email: "manager.div4@bertrandt.com",
        password,
        role: UserRole.InventoryManager,
        division: Division.Division4,
        group: CollaboratorGroup.Group4,
        managedDivision: Division.Division4,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
      {
        name: "Collaborator Division 1",
        email: "collab.div1@bertrandt.com",
        password,
        role: UserRole.Collaborator,
        division: Division.Division1,
        group: CollaboratorGroup.Group1,
        managedDivision: null,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
      {
        name: "Collaborator Division 2",
        email: "collab.div2@bertrandt.com",
        password,
        role: UserRole.Collaborator,
        division: Division.Division2,
        group: CollaboratorGroup.Group2,
        managedDivision: null,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
      {
        name: "Collaborator Division 3",
        email: "collab.div3@bertrandt.com",
        password,
        role: UserRole.Collaborator,
        division: Division.Division3,
        group: CollaboratorGroup.Group3,
        managedDivision: null,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
      {
        name: "Collaborator Division 4",
        email: "collab.div4@bertrandt.com",
        password,
        role: UserRole.Collaborator,
        division: Division.Division4,
        group: CollaboratorGroup.Group4,
        managedDivision: null,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
      {
        name: "Viewer User",
        email: "viewer@bertrandt.com",
        password,
        role: UserRole.Viewer,
        division: Division.Division1,
        group: CollaboratorGroup.Group1,
        managedDivision: null,
        emailVerificationStatus: EmailVerificationStatus.Verified,
      },
    ]

    for (const user of users) {
      await this.createSeedUser(user)
    }
  }

  private async createSeedUser(input: CreateUserInput) {
    const email = input.email.toLowerCase().trim()
    const existingUser = await this.findByEmail(email)

    if (existingUser) {
      return existingUser
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
      emailVerificationStatus: EmailVerificationStatus.Verified,
    })

    return this.usersRepository.save(user)
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
