import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { Collaborator } from "../../collaborators/entities/collaborator.entity"
import { Part } from "../../parts/entities/part.entity"

export enum ReservationStatus {
  Reserved = "Reserved",
  Borrowed = "Borrowed",
  Returned = "Returned",
}

@Entity("reservations")
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  collaboratorId: number

  @Column()
  partId: number

  @Column()
  quantity: number

  @Column({ type: "date" })
  expectedReturnDate: string

  @Column({ type: "enum", enum: ReservationStatus })
  status: ReservationStatus

  @ManyToOne(() => Collaborator, (collaborator) => collaborator.reservations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "collaboratorId" })
  collaborator: Collaborator

  @ManyToOne(() => Part, (part) => part.reservations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "partId" })
  part: Part

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
