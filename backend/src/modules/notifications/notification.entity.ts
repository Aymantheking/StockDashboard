import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"

export enum NotificationType {
  PartRequestCreated = "PartRequestCreated",
  PartRequestApproved = "PartRequestApproved",
  PartRequestRejected = "PartRequestRejected",
  ReturnDeclared = "ReturnDeclared",
  ReturnConfirmed = "ReturnConfirmed",
  MissingItemRequestCreated = "MissingItemRequestCreated",
  MissingItemRequestApproved = "MissingItemRequestApproved",
  MissingItemRequestRejected = "MissingItemRequestRejected",
  PurchaseRequestCreated = "PurchaseRequestCreated",
  PurchaseRequestApproved = "PurchaseRequestApproved",
  PurchaseRequestOrdered = "PurchaseRequestOrdered",
  PurchaseRequestInTransit = "PurchaseRequestInTransit",
  PurchaseRequestReceived = "PurchaseRequestReceived",
  PurchaseReminder = "PurchaseReminder",
  UserVerificationPending = "UserVerificationPending",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "int" })
  recipientUserId: number

  @Column({ type: "varchar" })
  title: string

  @Column({ type: "text" })
  message: string

  @Column({ type: "enum", enum: NotificationType })
  type: NotificationType

  @Column({ type: "varchar" })
  targetPage: string

  @Column({ nullable: true, type: "varchar" })
  targetSection: string | null

  @Column({ nullable: true, type: "int" })
  targetId: number | null

  @Column({ default: false })
  isRead: boolean

  @Column({ default: false })
  isActionable: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
