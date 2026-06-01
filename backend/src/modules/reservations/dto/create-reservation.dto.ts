import { ApiProperty } from "@nestjs/swagger"
import { IsDateString, IsEnum, IsInt, Min } from "class-validator"
import { ReservationStatus } from "../entities/reservation.entity"

export class CreateReservationDto {
  @ApiProperty()
  @IsInt()
  collaboratorId: number

  @ApiProperty()
  @IsInt()
  partId: number

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ example: "2026-06-10" })
  @IsDateString()
  expectedReturnDate: string

  @ApiProperty({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  status: ReservationStatus
}
