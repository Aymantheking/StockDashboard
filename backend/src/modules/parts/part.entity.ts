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

  @Column({ default: "" })
  manufacturer: string

  @Column()
  reference: string

  @Column({ type: "int", default: 0 })
  totalQuantity: number

  @Column({ type: "int", default: 0 })
  availableQuantity: number

  @Column({ type: "int", default: 0 })
  reservedQuantity: number

  @Column({ type: "int", default: 0 })
  borrowedQuantity: number

  @Column({ type: "int", default: 0 })
  damagedQuantity: number

  @Column({ type: "int", default: 0 })
  quantity: number

  @Column()
  location: string

  @Column({ default: "", type: "text" })
  description: string

  @Column({ default: "", type: "text" })
  stockAllocationNote: string

  @Column({ default: "" })
  status: string

  @OneToMany(() => Reservation, (reservation) => reservation.part)
  reservations: Reservation[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
