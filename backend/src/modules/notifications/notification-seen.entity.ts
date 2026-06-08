import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm"

@Entity("notification_seen")
@Unique(["userId", "notificationId"])
export class NotificationSeen {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "int" })
  userId: number

  @Column({ type: "varchar" })
  notificationId: string

  @CreateDateColumn()
  seenAt: Date
}
