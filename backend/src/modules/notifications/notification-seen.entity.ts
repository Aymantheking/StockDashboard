import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm"

@Entity("notification_seen")
@Index(["userId", "notificationKey"], { unique: true })
export class NotificationSeen {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "int" })
  userId: number

  @Column({ type: "varchar", length: 255 })
  notificationKey: string

  @CreateDateColumn()
  createdAt: Date
}
