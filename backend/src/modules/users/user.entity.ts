import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import {
  CollaboratorGroup,
  Division,
} from "../collaborators/collaborator.entity"

export enum UserRole {
  Admin = "Admin",
  InventoryManager = "Inventory Manager",
  Collaborator = "Collaborator",
  Viewer = "Viewer",
}

export enum EmailVerificationStatus {
  Pending = "Pending",
  Verified = "Verified",
  Rejected = "Rejected",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ unique: true })
  email: string

  @Column()
  passwordHash: string

  @Column({ type: "enum", enum: UserRole })
  role: UserRole

  @Column({ type: "enum", enum: Division })
  division: Division

  @Column({ name: "user_group", type: "enum", enum: CollaboratorGroup })
  group: CollaboratorGroup

  @Column({ nullable: true, type: "enum", enum: Division })
  managedDivision: Division | null

  @Column({
    type: "enum",
    enum: EmailVerificationStatus,
    default: EmailVerificationStatus.Verified,
  })
  emailVerificationStatus: EmailVerificationStatus

  @Column({ type: "text", default: "" })
  verificationComment: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
