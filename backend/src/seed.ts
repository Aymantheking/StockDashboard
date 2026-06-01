import { NestFactory } from "@nestjs/core"
import { getRepositoryToken } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { AppModule } from "./app.module"
import {
  Collaborator,
  CollaboratorGroup,
  Division,
} from "./modules/collaborators/entities/collaborator.entity"
import { Part } from "./modules/parts/entities/part.entity"
import {
  Reservation,
  ReservationStatus,
} from "./modules/reservations/entities/reservation.entity"

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule)

  const partsRepository = app.get<Repository<Part>>(getRepositoryToken(Part))
  const collaboratorsRepository = app.get<Repository<Collaborator>>(
    getRepositoryToken(Collaborator)
  )
  const reservationsRepository = app.get<Repository<Reservation>>(
    getRepositoryToken(Reservation)
  )

  await reservationsRepository.createQueryBuilder().delete().execute()
  await partsRepository.createQueryBuilder().delete().execute()
  await collaboratorsRepository.createQueryBuilder().delete().execute()

  const parts = await partsRepository.save([
    partsRepository.create({
      name: "STM32 Nucleo Board",
      category: "Microcontroller",
      reference: "NUCLEO-F446RE",
      quantity: 12,
      location: "Lab A - Shelf 1",
      status: "Available",
    }),
    partsRepository.create({
      name: "Ultrasonic Sensor",
      category: "Sensor",
      reference: "HC-SR04",
      quantity: 5,
      location: "Lab B - Box 3",
      status: "Low Stock",
    }),
    partsRepository.create({
      name: "Raspberry Pi 4",
      category: "Development Board",
      reference: "RPi-4B",
      quantity: 3,
      location: "Cabinet C2",
      status: "Borrowed",
    }),
  ])

  const collaborators = await collaboratorsRepository.save([
    collaboratorsRepository.create({
      name: "Ayman Douah",
      email: "ayman.douah@bertrandt.com",
      division: Division.Admin,
      group: CollaboratorGroup.Group1,
      role: "Inventory Manager",
    }),
    collaboratorsRepository.create({
      name: "Ahmed B.",
      email: "ahmed.b@bertrandt.com",
      division: Division.Division1,
      group: CollaboratorGroup.Group2,
      role: "Embedded Engineer",
    }),
    collaboratorsRepository.create({
      name: "Sara M.",
      email: "sara.m@bertrandt.com",
      division: Division.Division2,
      group: CollaboratorGroup.Group3,
      role: "Validation Engineer",
    }),
    collaboratorsRepository.create({
      name: "Youssef A.",
      email: "youssef.a@bertrandt.com",
      division: Division.Division3,
      group: CollaboratorGroup.Group4,
      role: "Hardware Technician",
    }),
  ])

  await reservationsRepository.save([
    reservationsRepository.create({
      collaboratorId: collaborators[1].id,
      partId: parts[2].id,
      quantity: 1,
      expectedReturnDate: "2026-06-10",
      status: ReservationStatus.Borrowed,
    }),
    reservationsRepository.create({
      collaboratorId: collaborators[2].id,
      partId: parts[1].id,
      quantity: 2,
      expectedReturnDate: "2026-06-07",
      status: ReservationStatus.Reserved,
    }),
  ])

  await app.close()
}

seed()
  .then(() => {
    console.log("Seed data inserted")
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
