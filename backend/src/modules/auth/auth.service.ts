import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import * as bcrypt from "bcryptjs"
import { UsersService } from "../users/users.service"
import { UserRole } from "../users/user.entity"
import {
  CollaboratorGroup,
  Division,
} from "../collaborators/collaborator.entity"

type RegisterInput = {
  name: string
  email: string
  password: string
  division: Division
  group: CollaboratorGroup
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async register(input: RegisterInput) {
    if (!input.email?.toLowerCase().endsWith("@bertrandt.com")) {
      throw new BadRequestException("Email must end with @bertrandt.com")
    }

    const user = await this.usersService.create({
      ...input,
      role: UserRole.Collaborator,
      managedDivision: null,
    })

    return this.createAuthResponse(user.id)
  }

  async login(email: string, password: string) {
    if (!email?.trim() || !password) {
      throw new BadRequestException("Email and password are required")
    }

    const user = await this.usersService.findByEmail(email)

    if (!user) {
      throw new UnauthorizedException("Invalid email or password")
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password")
    }

    return this.createAuthResponse(user.id)
  }

  async getProfile(userId: number) {
    const user = await this.usersService.findById(userId)

    return this.usersService.toPublicUser(user)
  }

  private async createAuthResponse(userId: number) {
    const user = await this.usersService.findById(userId)
    const publicUser = this.usersService.toPublicUser(user)
    const accessToken = await this.jwtService.signAsync({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      division: user.division,
      group: user.group,
      managedDivision: user.managedDivision,
    })

    return {
      accessToken,
      user: publicUser,
    }
  }
}
