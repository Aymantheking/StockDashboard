import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Collaborator } from "../collaborators/collaborator.entity"
import { Part } from "../parts/part.entity"
import { Reservation } from "./reservation.entity"
import { ReservationsController } from "./reservations.controller"
import { ReservationsService } from "./reservations.service"

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Part, Collaborator])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
