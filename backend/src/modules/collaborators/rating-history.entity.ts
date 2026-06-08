import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm"
import { Collaborator } from "./collaborator.entity"

@Entity("collaborator_rating_history")
export class RatingHistory {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "int", nullable: true, unique: true })
  requestId: number | null

  @Column({ type: "int" })
  collaboratorId: number

  @Column({ type: "float" })
  previousRating: number

  @Column({ type: "float" })
  newRating: number

  @Column({ type: "text" })
  reason: string

  @Column()
  changedBy: string

  @ManyToOne(() => Collaborator, { onDelete: "CASCADE" })
  @JoinColumn({ name: "collaboratorId" })
  collaborator: Collaborator

  @CreateDateColumn()
  createdAt: Date
}
