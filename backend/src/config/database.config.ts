import { TypeOrmModuleOptions } from "@nestjs/typeorm"
import { Collaborator } from "../modules/collaborators/entities/collaborator.entity"
import { Part } from "../modules/parts/entities/part.entity"
import { Reservation } from "../modules/reservations/entities/reservation.entity"

export function databaseConfig(): TypeOrmModuleOptions {
  return {
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "stock_dashboard",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    entities: [Part, Collaborator, Reservation],
    synchronize: process.env.DB_SYNC !== "false",
  }
}
