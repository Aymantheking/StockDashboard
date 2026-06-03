import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { Reservation } from "../reservations/reservation.entity"

@Entity("parts")
export class Part {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  category: string

  @Column()
  reference: string

  @Column()
  quantity: number

  @Column()
  location: string

  @Column()
  status: string

  @OneToMany(() => Reservation, (reservation) => reservation.part)
  reservations: Reservation[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
