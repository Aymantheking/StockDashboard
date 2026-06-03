import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { RequestStatus } from "../requests/part-request.entity"

@Entity("missing_item_requests")
export class MissingItemRequest {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  collaboratorId: number

  @Column()
  itemName: string

  @Column()
  category: string

  @Column({ nullable: true })
  manufacturer: string

  @Column({ nullable: true })
  reference: string

  @Column()
  quantityNeeded: number

  @Column({ type: "text" })
  reason: string

  @Column({ type: "date" })
  neededDate: string

  @Column({ type: "enum", enum: RequestStatus, default: RequestStatus.Pending })
  status: RequestStatus

  @Column({ nullable: true, type: "text" })
  managerComment: string

  @ManyToOne(() => Collaborator, { onDelete: "CASCADE" })
  @JoinColumn({ name: "collaboratorId" })
  collaborator: Collaborator

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
