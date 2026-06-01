import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { Reservation } from "../../reservations/entities/reservation.entity"

export enum Division {
  Division1 = "Division 1",
  Division2 = "Division 2",
  Division3 = "Division 3",
  Division4 = "Division 4",
  Admin = "Admin",
}

export enum CollaboratorGroup {
  Group1 = "Group 1",
  Group2 = "Group 2",
  Group3 = "Group 3",
  Group4 = "Group 4",
}

@Entity("collaborators")
export class Collaborator {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ unique: true })
  email: string

  @Column({ type: "enum", enum: Division })
  division: Division

  @Column({ name: "collaborator_group", type: "enum", enum: CollaboratorGroup })
  group: CollaboratorGroup

  @Column()
  role: string

  @OneToMany(() => Reservation, (reservation) => reservation.collaborator)
  reservations: Reservation[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
